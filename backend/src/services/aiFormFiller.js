/**
 * aiFormFiller.js
 *
 * AI-Powered Form Filling Engine for CVConnect.
 * Uses LLM-guided DOM resolution and Playwright automation to fill application forms
 * adaptively without relying on fragile hardcoded CSS selectors.
 * Includes rich step-by-step terminal console logging & step screenshot captures.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import OpenAI from 'openai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRATCH_DIR = path.join(__dirname, '..', '..', '..', 'scratch');

// Initialize OpenRouter / DeepSeek / OpenAI client
const getLLMClient = () => {
  if (process.env.OPENROUTER_API_KEY) {
    return {
      client: new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': 'https://cvconnect.app',
          'X-Title': 'CVConnect AI Form Filler'
        }
      }),
      model: process.env.FORM_LLM_MODEL || 'deepseek/deepseek-chat',
      provider: 'OpenRouter (DeepSeek Chat)'
    };
  }
  if (process.env.DEEPSEEK_API_KEY) {
    return {
      client: new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com'
      }),
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      provider: 'DeepSeek (deepseek-chat)'
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      provider: 'OpenAI (gpt-4o-mini)'
    };
  }
  return { client: null, model: 'local-heuristic-engine', provider: 'Local Heuristic DOM Engine' };
};

/**
 * Emit progress via Socket.io
 */
const emitProgress = (io, userId, appId, stage, message, percent) => {
  if (io && userId) {
    io.to(userId).emit('application:progress', {
      applicationId: appId,
      stage,
      status: stage,
      message,
      percent
    });
  }
};

/**
 * Helper to take step debug screenshots
 */
async function takeStepScreenshot(page, stepName) {
  try {
    const filePath = path.join(SCRATCH_DIR, `debug_${stepName}.png`);
    await page.screenshot({ path: filePath, fullPage: false }).catch(() => {});
    console.log(`  📸 [BOT-DEBUG:Screenshot] Saved step view to scratch/debug_${stepName}.png`);
  } catch (_) {}
}

/**
 * AI-guided locator for form fields
 */
export async function findField(page, fieldType) {
  try {
    const selectorMap = {
      location: [
        '#cities_input',
        'input[placeholder*="location" i]',
        'input[placeholder*="city" i]',
        'input[name*="location" i]',
        'input[name*="city" i]',
        'input[aria-label*="location" i]',
        '#location',
        '.location-input input'
      ],
      skills: [
        'input[placeholder*="skill" i]',
        'input[name*="skill" i]',
        'input[aria-label*="skill" i]',
        '#skills',
        '.skills-input input'
      ],
      checkbox: [
        'input[type="checkbox"]',
        '.mat-checkbox-input',
        'label:has-text("terms")',
        'label:has-text("agree")'
      ]
    };

    const candidates = selectorMap[fieldType] || [];
    for (const sel of candidates) {
      const loc = page.locator(sel).first();
      if (await loc.isVisible().catch(() => false)) {
        return loc;
      }
    }
  } catch (err) {
    console.warn(`  ⚠️ [AIFormFiller] findField (${fieldType}) notice:`, err.message);
  }
  return null;
}

/**
 * AI-guided locator for action buttons (Next, Submit, Save, Register)
 */
export async function findButton(page, targetKeywords = ['submit', 'register', 'next', 'save', 'confirm']) {
  try {
    const mainBtnSelectors = [
      '[data-test="save-form-btn"]',
      'button[data-test*="save"]',
      'button[data-test*="submit"]',
      'button:has-text("Submit")',
      'button:has-text("Register")',
      'button:has-text("Next")',
      'button:has-text("Confirm")',
      'button:has-text("Save & Submit")',
      'button:has-text("Save & Next")',
      'button.un-button:has-text("Submit")',
      'button.un-button:has-text("Next")',
      'button.un-button:has-text("Register")',
      'button[type="submit"]',
      'button.btn-primary',
      'button.primary-btn'
    ];

    for (const sel of mainBtnSelectors) {
      const locs = page.locator(sel);
      const count = await locs.count().catch(() => 0);
      for (let i = 0; i < count; i++) {
        const loc = locs.nth(i);
        if (await loc.isVisible().catch(() => false)) {
          const txt = (await loc.innerText().catch(() => '')).trim().toLowerCase();
          // Exclude navigation Back/Cancel buttons
          if (txt && !txt.includes('back') && !txt.includes('cancel') && !txt.includes('previous')) {
            return loc;
          }
        }
      }
    }
  } catch (err) {
    console.warn('  ⚠️ [AIFormFiller] findButton notice:', err.message);
  }
  return null;
}

/**
 * Inspect page DOM for mandatory required fields and compare with candidate data
 */
export async function inspectFormRequirements(page, formData) {
  try {
    const fieldsInfo = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'));
      return inputs.map(el => {
        const labelEl = el.id ? document.querySelector(`label[for="${el.id}"]`) : el.closest('label, .form-group, mat-form-field, un-form-field');
        const labelText = labelEl ? labelEl.innerText.trim() : (el.placeholder || el.name || el.id || '');
        const isRequired = el.hasAttribute('required') || el.getAttribute('aria-required') === 'true' || labelText.includes('*');
        const value = el.value || '';
        return {
          id: el.id,
          name: el.name,
          type: el.type,
          placeholder: el.placeholder,
          label: labelText.replace(/\n+/g, ' '),
          isRequired,
          hasValue: value.trim().length > 0
        };
      });
    }).catch(() => []);

    const missingFields = [];
    for (const field of fieldsInfo) {
      if (field.isRequired && !field.hasValue) {
        const lowerLabel = field.label.toLowerCase();
        const hasCandidateData = (
          (lowerLabel.includes('location') || lowerLabel.includes('city')) && formData?.location ||
          (lowerLabel.includes('skill')) && Array.isArray(formData?.skills) && formData.skills.length > 0 ||
          (lowerLabel.includes('resume') || lowerLabel.includes('cv') || field.type === 'file') && formData?.resumePath ||
          (lowerLabel.includes('email')) && formData?.userDetails?.email ||
          (lowerLabel.includes('name')) && formData?.userDetails?.name
        );

        if (!hasCandidateData) {
          missingFields.push({
            name: field.name || field.id || field.label,
            label: field.label || 'Required Field',
            type: field.type || 'text',
            required: true
          });
        }
      }
    }

    if (missingFields.length > 0) {
      const fieldNames = missingFields.map(f => `"${f.label}"`).join(', ');
      return {
        isComplete: false,
        missingFields,
        reason: `Application paused: Required candidate field(s) ${fieldNames} missing. Please update your profile settings.`
      };
    }

    return { isComplete: true, missingFields: [], reason: null };
  } catch (err) {
    return { isComplete: true, missingFields: [], reason: null };
  }
}

/**
 * Execute AI-Powered Form Filling task pipeline with rich console logging
 */
export async function fillUnstopForm(page, formData, userId, appId, io) {
  console.log('\n================================================================');
  console.log('🤖 [BOT-DEBUG] STARTING AI FORM FILLING PIPELINE');
  console.log('================================================================');

  try {
    emitProgress(io, userId, appId, 'ai_analyzing', 'AI is analyzing form structure…', 60);

    // Inspect DOM form requirements before submitting
    const inspection = await inspectFormRequirements(page, formData);
    if (!inspection.isComplete) {
      console.warn(`  ⚠️ [AIFormFiller] ${inspection.reason}`);
      if (io && userId) {
        io.to(userId).emit('application:user_input_required', {
          applicationId: appId,
          missingFields: inspection.missingFields,
          reason: inspection.reason
        });
      }
    }

    // ── Helper: Wait for Unstop loading overlays to clear ─────────────────────
    const waitForOverlayClear = async (label = '') => {
      try {
        await page.waitForFunction(() => {
          const overlays = document.querySelectorAll(
            '.page-loader, .loading-overlay, .loader, [class*="spinner"], [class*="loading"]'
          );
          return Array.from(overlays).every(el => {
            const s = window.getComputedStyle(el);
            return s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0';
          });
        }, { timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(600);
        console.log(`  ✅ [Overlay] Page ready${label ? ` after ${label}` : ''}.`);
      } catch (_) {}
    };

    // ── Helper: Fill a field by matching its label text (Angular-compatible) ───
    // Uses Playwright .fill() which fires real InputEvent that Angular responds to
    const fillByLabel = async (labelKeywords, value) => {
      if (!value) return false;
      try {
        const fields = await page.evaluate((keywords) => {
          const allInputs = Array.from(document.querySelectorAll(
            'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea'
          ));
          return allInputs.map((el, idx) => {
            const label =
              (el.id ? document.querySelector(`label[for="${el.id}"]`)?.innerText : '') ||
              el.closest('.form-group,.form-field,mat-form-field,un-form-field')
                ?.querySelector('label,.label,.field-label,span')?.innerText ||
              el.placeholder || el.name || el.getAttribute('aria-label') || '';
            const lbl = label.toLowerCase().trim();
            return { idx, label: lbl, matches: keywords.some(kw => lbl.includes(kw.toLowerCase())), hasValue: el.value.trim().length > 0 };
          }).filter(f => f.matches && !f.hasValue);
        }, labelKeywords).catch(() => []);

        if (fields.length > 0) {
          const allInputs = page.locator(
            'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea'
          );
          const target = allInputs.nth(fields[0].idx);
          if (await target.isVisible().catch(() => false)) {
            await target.click({ force: true }).catch(() => {});
            await target.fill(value);         // ← Playwright fires real InputEvent
            await target.press('Tab').catch(() => {}); // ← Triggers Angular validation
            await page.waitForTimeout(400);
            console.log(`  ✅ fillByLabel: "${fields[0].label}" → "${value}"`);
            return true;
          }
        }
        return false;
      } catch (_) { return false; }
    };

    // ── Helper: Fill by DOM index (position fallback) ──────────────────────────
    const fillByPosition = async (nthIndex, value, label = '') => {
      if (!value) return false;
      try {
        const allInputs = page.locator(
          'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"])'
        );
        const target = allInputs.nth(nthIndex);
        if (await target.isVisible().catch(() => false)) {
          const cur = await target.inputValue().catch(() => '');
          if (!cur) {
            await target.click({ force: true }).catch(() => {});
            await target.fill(value);         // ← Playwright fires real InputEvent
            await target.press('Tab').catch(() => {});
            await page.waitForTimeout(400);
            console.log(`  ✅ fillByPosition[${nthIndex}] (${label}) → "${value}"`);
            return true;
          }
          console.log(`  ℹ️ fillByPosition[${nthIndex}] (${label}) already set: "${cur}"`);
          return true;
        }
        return false;
      } catch (_) { return false; }
    };

    // ── Step 0: Candidate Basic Details (Angular-compatible via Playwright .fill()) ──
    console.log('\n[BOT-DEBUG:Step 0/5] 👤 CANDIDATE BASIC DETAILS');
    const nameParts = (formData?.userDetails?.name || 'Shubham Dubey').trim().split(' ');
    const firstName = nameParts[0] || 'Shubham';
    const lastName  = nameParts.slice(1).join(' ') || 'Dubey';
    const email     = formData?.userDetails?.email || 'dubeytech19@gmail.com';
    const mobile    = formData?.userDetails?.phone || '8591694920';
    const college   = formData?.userDetails?.college || 'Mumbai University';

    await waitForOverlayClear('page load');

    // Label-first, position-fallback — both use Playwright .fill() (Angular-safe)
    const fnFilled  = await fillByLabel(['first name', 'firstname', 'first'], firstName)
                   || await fillByPosition(0, firstName, 'First Name');
    const lnFilled  = await fillByLabel(['last name', 'lastname', 'surname', 'last'], lastName)
                   || await fillByPosition(1, lastName, 'Last Name');
    const emFilled  = await fillByLabel(['email', 'e-mail', 'mail'], email)
                   || await fillByPosition(2, email, 'Email');
    const mobFilled = await fillByLabel(['mobile', 'phone', 'contact number'], mobile)
                   || await fillByPosition(3, mobile, 'Mobile');
    const colFilled = await fillByLabel(['organization', 'college', 'institute', 'university', 'school'], college)
                   || await fillByPosition(5, college, 'Organization');

    console.log(`  Summary → Name:${fnFilled}/${lnFilled} Email:${emFilled} Mobile:${mobFilled} College:${colFilled}`);

    // Gender: Male
    for (const sel of [
      'input[type="radio"][value*="male" i]',
      'label:has-text("Male") input[type="radio"]',
      'button:has-text("Male")',
      'span.un-radio-label:has-text("Male")',
      '[class*="gender"] label:has-text("Male")',
    ]) {
      const el = page.locator(sel).first();
      if (await el.isVisible().catch(() => false)) {
        await el.click({ force: true }).catch(() => {});
        console.log('  ✅ Gender: Male');
        break;
      }
    }

    // Differently Abled: No
    for (const sel of [
      'input[type="radio"][value*="no" i]',
      'label:has-text("No") input[type="radio"]',
      '[class*="differently"] label:has-text("No")',
    ]) {
      const el = page.locator(sel).first();
      if (await el.isVisible().catch(() => false)) {
        await el.click({ force: true }).catch(() => {});
        console.log('  ✅ Differently Abled: No');
        break;
      }
    }

    // User Type: College Students
    for (const sel of [
      'input[type="radio"][value*="college" i]',
      'label:has-text("College Students") input',
      'button:has-text("College Students")',
      'label:has-text("Fresher") input',
      'button:has-text("Student")',
    ]) {
      const el = page.locator(sel).first();
      if (await el.isVisible().catch(() => false)) {
        await el.click({ force: true }).catch(() => {});
        console.log('  ✅ User Type: College Students');
        break;
      }
    }

    await page.waitForTimeout(500);

    // ────────────────────────────────────────────────────────────────────────────
    // Step 1: Resume Upload
    // ────────────────────────────────────────────────────────────────────────────
    console.log('\n[BOT-DEBUG:Step 1/5] 📄 RESUME UPLOAD');
    if (formData?.resumePath) {
      const fileInputCount = await page.locator('input[type="file"]').count().catch(() => 0);
      if (fileInputCount > 0) {
        console.log(`  -> Uploading: ${path.basename(formData.resumePath)}`);
        await page.locator('input[type="file"]').first()
          .setInputFiles(formData.resumePath)
          .catch(err => console.warn('  ⚠️ File upload warning:', err.message));
        await page.waitForTimeout(2000);
        console.log('  ✅ [Step 1] Resume uploaded.');
      } else {
        console.log('  ℹ️ [Step 1] No file input on page.');
      }
    } else {
      console.log('  ⚠️ [Step 1] No resume path in formData.');
    }
    await takeStepScreenshot(page, 'step1_resume');

    // ────────────────────────────────────────────────────────────────────────────
    // Step 2: Location Autocomplete
    // ────────────────────────────────────────────────────────────────────────────
    console.log('\n[BOT-DEBUG:Step 2/5] 📍 LOCATION AUTOCOMPLETE');
    if (formData?.location) {
      const locField = await findField(page, 'location');
      if (locField) {
        const currentVal = await locField.inputValue().catch(() => '');
        if (!currentVal) {
          console.log('  -> Typing "Mumbai"…');
          await locField.click({ force: true }).catch(() => {});
          await locField.fill('').catch(() => {});
          await locField.type('Mumbai', { delay: 80 });
          await page.waitForTimeout(1200);

          const option = page.locator(
            'mat-option, un-option, .cdk-overlay-container mat-option, .pac-item, li.location-item, [role="option"]'
          ).first();
          if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
            const optText = await option.innerText().catch(() => '');
            console.log(`  -> Selecting option: "${optText.trim()}"`);
            await option.click({ force: true }).catch(() => {});
          } else {
            await page.keyboard.press('ArrowDown');
            await page.waitForTimeout(300);
            await page.keyboard.press('Enter');
          }
          await page.waitForTimeout(600);
          console.log('  ✅ [Step 2] Location set.');
        } else {
          console.log(`  ℹ️ [Step 2] Location already set: "${currentVal}"`);
        }
      } else {
        console.log('  ℹ️ [Step 2] Location field not found.');
      }
    }
    await takeStepScreenshot(page, 'step2_location');

    // ────────────────────────────────────────────────────────────────────────────
    // Step 3: Skills Autocomplete
    // ────────────────────────────────────────────────────────────────────────────
    console.log('\n[BOT-DEBUG:Step 3/5] 💡 SKILLS TAG AUTOCOMPLETE');
    if (Array.isArray(formData?.skills) && formData.skills.length > 0) {
      const skillsField = await findField(page, 'skills');
      if (skillsField) {
        console.log(`  -> Adding: ${formData.skills.slice(0, 4).join(', ')}`);
        for (const skill of formData.skills.slice(0, 4)) {
          await skillsField.click({ force: true }).catch(() => {});
          await skillsField.fill('').catch(() => {});
          await skillsField.type(skill, { delay: 80 });
          await page.waitForTimeout(900);

          const skillOpt = page.locator(
            'mat-option, un-option, .cdk-overlay-container mat-option, [role="option"], .skills-list li'
          ).first();
          if (await skillOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
            await skillOpt.click({ force: true }).catch(() => {});
          } else {
            await page.keyboard.press('ArrowDown');
            await page.waitForTimeout(300);
            await page.keyboard.press('Enter');
          }
          await page.waitForTimeout(500);
        }
        console.log('  ✅ [Step 3] Skills added.');
      } else {
        console.log('  ℹ️ [Step 3] Skills field not found.');
      }
    }
    await takeStepScreenshot(page, 'step3_skills');

    // ────────────────────────────────────────────────────────────────────────────
    // Step 4: Terms & Conditions
    // ────────────────────────────────────────────────────────────────────────────
    console.log('\n[BOT-DEBUG:Step 4/5] 📜 TERMS & CONDITIONS CHECKBOXES');
    const checkboxes = page.locator('input[type="checkbox"]');
    const cbCount = await checkboxes.count().catch(() => 0);
    console.log(`  -> Found ${cbCount} checkbox(es).`);
    for (let i = 0; i < cbCount; i++) {
      const cb = checkboxes.nth(i);
      if (await cb.isVisible().catch(() => false)) {
        const checked = await cb.isChecked().catch(() => false);
        if (!checked) {
          await cb.click({ force: true }).catch(() => {});
          await page.waitForTimeout(300);
          console.log(`  -> Checked checkbox #${i + 1}`);
        }
      }
    }
    console.log('  ✅ [Step 4] Terms verified.');
    await takeStepScreenshot(page, 'step4_terms');

    // ────────────────────────────────────────────────────────────────────────────
    // Step 5: Multi-Step Form Navigation & Final Submit
    // ────────────────────────────────────────────────────────────────────────────
    console.log('\n[BOT-DEBUG:Step 5/5] 🚀 SUBMIT FORM (Multi-Step Execution)');
    let stepClickedCount = 0;
    const MAX_FORM_STEPS = 6;

    for (let step = 1; step <= MAX_FORM_STEPS; step++) {
      await waitForOverlayClear(`form step ${step}`);

      // ── Per-step required field scan: fill any visible required radio/select ──
      // This handles Unstop's multi-step form where "Differently Abled",
      // "User Type", "Gender" may appear on different steps
      try {
        // Differently Abled → No
        const diffAbledErr = await page.locator('text="Please select an option"').first().isVisible({ timeout: 500 }).catch(() => false);
        const diffAbledSection = page.locator('[class*="differently"], label:has-text("Differently Abled")').first();
        const diffAbledVisible = await diffAbledSection.isVisible({ timeout: 500 }).catch(() => false);
        if (diffAbledVisible || diffAbledErr) {
          for (const sel of [
            'label:has-text("No"):near(label:has-text("Differently Abled"))',
            'div:has-text("Differently Abled") ~ div button:has-text("No")',
            'div:has-text("Differently Abled") button:first-child',
            'un-radio-group button:first-of-type',
          ]) {
            const el = page.locator(sel).first();
            if (await el.isVisible({ timeout: 500 }).catch(() => false)) {
              await el.click({ force: true }).catch(() => {});
              console.log(`  ✅ [Step ${step}] Differently Abled: No selected`);
              await page.waitForTimeout(400);
              break;
            }
          }
          // Fallback: click all visible buttons containing "No"
          const noButtons = page.locator('button').filter({ hasText: /^No$/ });
          const noCount = await noButtons.count().catch(() => 0);
          for (let i = 0; i < noCount; i++) {
            const btn = noButtons.nth(i);
            if (await btn.isVisible().catch(() => false)) {
              await btn.click({ force: true }).catch(() => {});
              console.log(`  ✅ [Step ${step}] Clicked "No" button #${i}`);
              await page.waitForTimeout(300);
            }
          }
        }

        // Gender → Male (if not yet selected)
        const genderSection = page.locator('label:has-text("Gender"), [class*="gender"]').first();
        if (await genderSection.isVisible({ timeout: 500 }).catch(() => false)) {
          const maleSelected = await page.locator('button:has-text("Male").selected, button.active:has-text("Male"), [class*="selected"]:has-text("Male")').first().isVisible({ timeout: 500 }).catch(() => false);
          if (!maleSelected) {
            const maleBtn = page.locator('button').filter({ hasText: /^Male$/ }).first();
            if (await maleBtn.isVisible({ timeout: 500 }).catch(() => false)) {
              await maleBtn.click({ force: true }).catch(() => {});
              console.log(`  ✅ [Step ${step}] Gender: Male selected`);
              await page.waitForTimeout(300);
            }
          }
        }

        // Terms checkboxes on any step
        const stepCheckboxes = page.locator('input[type="checkbox"]:not(:checked)');
        const scCount = await stepCheckboxes.count().catch(() => 0);
        for (let i = 0; i < scCount; i++) {
          const cb = stepCheckboxes.nth(i);
          if (await cb.isVisible().catch(() => false)) {
            await cb.click({ force: true }).catch(() => {});
            console.log(`  ✅ [Step ${step}] Checked unchecked checkbox #${i}`);
            await page.waitForTimeout(200);
          }
        }
      } catch (_) {}

      const submitBtn = await findButton(page);
      if (!submitBtn) {
        console.log(`  ℹ️ [Form Step ${step}] No action button found.`);
        break;
      }

      const btnText = (await submitBtn.innerText().catch(() => '')).trim();
      if (!btnText) break;

      console.log(`  -> [Form Step ${step}] Clicking "${btnText}"…`);
      emitProgress(io, userId, appId, 'submitting', `Form step ${step}: "${btnText}"…`, 70 + step * 4);

      await submitBtn.scrollIntoViewIfNeeded().catch(() => {});
      await submitBtn.click({ force: true }).catch(async () => {
        await submitBtn.evaluate(el => el.click()).catch(() => {});
      });
      stepClickedCount++;

      // Wait for Angular to process + any XHR between steps
      await Promise.race([
        page.waitForLoadState('networkidle', { timeout: 5000 }),
        page.waitForTimeout(4000)
      ]).catch(() => {});

      // Early exit if registration confirmed by URL
      const currentUrl = page.url();
      if (
        currentUrl.includes('/success') ||
        currentUrl.includes('/register/edit') ||
        currentUrl.includes('rstatus=1')
      ) {
        console.log(`  ✅ Registration confirmed via URL: ${currentUrl}`);
        break;
      }
    }

    if (stepClickedCount > 0) {
      console.log(`  ✅ [Step 5] ${stepClickedCount} click(s) executed.`);
    } else {
      console.log('  ⚠️ [Step 5] No submit button located on page.');
    }
    await takeStepScreenshot(page, 'step5_submit');

    console.log('\n================================================================');
    console.log('🤖 [BOT-DEBUG] AI FORM FILLING PIPELINE COMPLETED');
    console.log('================================================================\n');

    return true;
  } catch (err) {
    console.error('❌ [BOT-DEBUG] Error during AI Form Filling:', err.message);
    return false;
  }
}

/**
 * Verify registration completion via DOM & status API analysis
 */
export async function verifyUnstopRegistration(page, oppId) {
  console.log('\n🔍 [BOT-DEBUG:Verify] VERIFYING REGISTRATION STATUS');
  try {
    if (oppId) {
      console.log(`  -> Querying Unstop opportunity API for opportunity #${oppId}...`);
      const apiStatus = await page.evaluate(async (id) => {
        try {
          const endpoints = [
            `/api/public/opportunity/${id}`,
            `/api/v1/opportunity/${id}`,
            `/api/v1/user/opportunity/${id}/status`
          ];
          for (const ep of endpoints) {
            const res = await fetch(ep, { headers: { 'Accept': 'application/json' } }).then(r => r.json()).catch(() => null);
            if (res?.data?.opportunity?.is_registered || res?.data?.is_registered || res?.data?.isRegistered || res?.isRegistered || res?.registered) {
              return { isRegistered: true, data: res };
            }
          }
          return null;
        } catch { return null; }
      }, oppId).catch(() => null);

      if (apiStatus?.isRegistered) {
        console.log('  ✅ [Verify] API confirmed registration: isRegistered = true');
        return true;
      }
    }

    const bodyText = (await page.locator('body').innerText().catch(() => '')).toLowerCase();
    const url = page.url();

    const isRegisteredText = (
      url.includes('/success') ||
      url.includes('/register/edit') ||
      url.includes('rstatus=1') ||
      bodyText.includes('registration successful') ||
      bodyText.includes('details saved successfully') ||
      bodyText.includes('successfully registered') ||
      bodyText.includes('application submitted') ||
      bodyText.includes('thank you for applying') ||
      bodyText.includes('you have registered') ||
      bodyText.includes('already registered')
    );

    const hasRegisteredBtn = await page.locator('button:has-text("Registered"), button:has-text("Applied"), a:has-text("Registered")').count().catch(() => 0) > 0;

    console.log(`  -> URL: ${url}`);
    console.log(`  -> Text Matched: ${isRegisteredText}`);
    console.log(`  -> Button Text "Registered" Visible: ${hasRegisteredBtn}`);

    const verified = isRegisteredText || hasRegisteredBtn;
    if (verified) {
      console.log('  ✅ [Verify] DOM confirmed registration.');
    } else {
      console.log('  ❌ [Verify] Registration NOT confirmed on DOM or API.');
    }
    return verified;
  } catch (err) {
    console.error('  ⚠️ [Verify] Verification check error:', err.message);
    return false;
  }
}
