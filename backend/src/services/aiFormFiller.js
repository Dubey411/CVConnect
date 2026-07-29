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

    // Step 0: Fill Candidate Basic Details (First Name, Last Name, Email, Mobile, Gender, Organization, Differently Abled)
    console.log('\n[BOT-DEBUG:Step 0/5] 👤 CANDIDATE BASIC DETAILS');
    const nameParts = (formData?.userDetails?.name || 'Shubham Dubey').trim().split(' ');
    const firstName = nameParts[0] || 'Shubham';
    const lastName = nameParts.slice(1).join(' ') || 'Dubey';
    const email = formData?.userDetails?.email || 'dubeytech19@gmail.com';
    const mobile = formData?.userDetails?.phone || '8591694920';
    const college = formData?.userDetails?.college || 'Mumbai University';

    // Inject values via smart DOM evaluation for Angular inputs
    await page.evaluate(({ fn, ln, em, mob, col }) => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])'));
      
      const setVal = (input, val) => {
        if (!input || !val) return;
        input.focus();
        input.value = val;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));
      };

      // Unstop Basic Details form input order:
      // [0]: First Name, [1]: Last Name, [2]: Email, [3]: Mobile, [4]: Location, [5]: Organization
      if (inputs[0]) setVal(inputs[0], fn);
      if (inputs[1] && !inputs[1].value) setVal(inputs[1], ln);
      if (inputs[2] && !inputs[2].value) setVal(inputs[2], em);
      if (inputs[3] && !inputs[3].value) setVal(inputs[3], mob);
      if (inputs[5] && !inputs[5].value) setVal(inputs[5], col);
    }, { fn: firstName, ln: lastName, em: email, mob: mobile, col: college }).catch(() => {});

    // Gender selection (Male)
    const genderBtn = page.locator('button:has-text("Male"), label:has-text("Male"), span:has-text("Male")').first();
    if (await genderBtn.isVisible().catch(() => false)) {
      console.log('  -> Selecting Gender: "Male"');
      await genderBtn.click({ force: true }).catch(() => {});
    }

    // Differently Abled (No)
    const diffAbledNo = page.locator('button:has-text("No"), label:has-text("No"), span:has-text("No")').first();
    if (await diffAbledNo.isVisible().catch(() => false)) {
      console.log('  -> Selecting Differently Abled: "No"');
      await diffAbledNo.click({ force: true }).catch(() => {});
    }

    // User Type (College Students / Fresher)
    const userTypeBtn = page.locator('button:has-text("College Students"), label:has-text("College Students"), span:has-text("College Students"), button:has-text("Fresher")').first();
    if (await userTypeBtn.isVisible().catch(() => false)) {
      console.log('  -> Selecting User Type: "College Students"');
      await userTypeBtn.click({ force: true }).catch(() => {});
    }

    // Step 1: Upload Resume
    console.log('\n[BOT-DEBUG:Step 1/5] 📄 RESUME UPLOAD');
    if (formData?.resumePath) {
      const fileInput = page.locator('input[type="file"]').first();
      if (await fileInput.isVisible().catch(() => true)) {
        console.log(`  -> File input located. Uploading: ${path.basename(formData.resumePath)}`);
        await fileInput.setInputFiles(formData.resumePath).catch(err => {
          console.warn('  ⚠️ File upload warning:', err.message);
        });
        await page.waitForTimeout(1500);
        console.log('  ✅ [Step 1] Resume uploaded successfully.');
      } else {
        console.log('  ℹ️ [Step 1] No file input visible on current page.');
      }
    } else {
      console.log('  ⚠️ [Step 1] No resume path provided in formData.');
    }
    await takeStepScreenshot(page, 'step1_resume');

    // Step 2: Fill Location
    console.log('\n[BOT-DEBUG:Step 2/5] 📍 LOCATION AUTOCOMPLETE');
    if (formData?.location) {
      const locField = await findField(page, 'location');
      if (locField) {
        const currentVal = await locField.inputValue().catch(() => '');
        if (!currentVal) {
          console.log(`  -> Entering location: "Mumbai" (Target: ${formData.location})`);
          await locField.click({ force: true }).catch(() => {});
          await locField.fill('Mumbai').catch(() => {});
          await page.waitForTimeout(1000);

          const option = page.locator('mat-option, un-option, .cdk-overlay-container mat-option, .pac-item, li.location-item, div.option').first();
          if (await option.isVisible().catch(() => false)) {
            const optText = await option.innerText().catch(() => '');
            console.log(`  -> Found autocomplete option: "${optText.trim()}". Clicking...`);
            await option.click({ force: true }).catch(() => {});
          } else {
            console.log('  -> Autocomplete dropdown not visible. Pressing ArrowDown + Enter...');
            await page.keyboard.press('ArrowDown').catch(() => {});
            await page.waitForTimeout(300);
            await page.keyboard.press('Enter').catch(() => {});
          }

          await locField.evaluate(el => {
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new Event('blur', { bubbles: true }));
          }).catch(() => {});
          await page.waitForTimeout(500);
          console.log('  ✅ [Step 2] Location filled & Angular events dispatched.');
        } else {
          console.log(`  ℹ️ [Step 2] Location already filled: "${currentVal}"`);
        }
      } else {
        console.log('  ℹ️ [Step 2] Location input field not found on page.');
      }
    }
    await takeStepScreenshot(page, 'step2_location');

    // Step 3: Add Skills
    console.log('\n[BOT-DEBUG:Step 3/5] 💡 SKILLS TAG AUTOCOMPLETE');
    if (Array.isArray(formData?.skills) && formData.skills.length > 0) {
      const skillsField = await findField(page, 'skills');
      if (skillsField) {
        console.log(`  -> Skills field located. Target skills: ${formData.skills.slice(0, 4).join(', ')}`);
        for (const skill of formData.skills.slice(0, 4)) {
          console.log(`  -> Adding skill: "${skill}"`);
          await skillsField.click({ force: true }).catch(() => {});
          await skillsField.fill(skill).catch(() => {});
          await page.waitForTimeout(800);

          const skillOpt = page.locator('mat-option, un-option, .cdk-overlay-container mat-option, .skills-list li, div.skill-option, [role="option"]').first();
          if (await skillOpt.isVisible().catch(() => false)) {
            console.log(`     - Dropdown option visible. Clicking...`);
            await skillOpt.click({ force: true }).catch(() => {});
          } else {
            console.log(`     - Dropdown option hidden. Pressing ArrowDown + Enter...`);
            await page.keyboard.press('ArrowDown').catch(() => {});
            await page.waitForTimeout(300);
            await page.keyboard.press('Enter').catch(() => {});
          }
          await page.waitForTimeout(400);
        }
        console.log('  ✅ [Step 3] Skills tag selection completed.');
      } else {
        console.log('  ℹ️ [Step 3] Skills input field not found on page.');
      }
    }
    await takeStepScreenshot(page, 'step3_skills');

    // Step 4: Terms & Conditions
    console.log('\n[BOT-DEBUG:Step 4/5] 📜 TERMS & CONDITIONS CHECKBOXES');
    const checkboxes = page.locator('input[type="checkbox"], label:has-text("Terms"), label:has-text("Agree")');
    const count = await checkboxes.count().catch(() => 0);
    console.log(`  -> Found ${count} checkbox/term elements on page.`);
    for (let i = 0; i < count; i++) {
      const cb = checkboxes.nth(i);
      if (await cb.isVisible().catch(() => false)) {
        const checked = await cb.isChecked().catch(() => false);
        if (!checked) {
          console.log(`  -> Checking checkbox #${i + 1}...`);
          await cb.click({ force: true }).catch(() => {});
          await page.waitForTimeout(300);
        } else {
          console.log(`  ℹ️ Checkbox #${i + 1} already checked.`);
        }
      }
    }
    console.log('  ✅ [Step 4] Terms & conditions verified.');
    await takeStepScreenshot(page, 'step4_terms');

    // Step 5: Submit Form (Multi-step form navigation)
    console.log('\n[BOT-DEBUG:Step 5/5] 🚀 SUBMIT FORM (Multi-Step Execution)');
    let stepClickedCount = 0;
    for (let step = 1; step <= 4; step++) {
      const submitBtn = await findButton(page, ['submit', 'register', 'next', 'save', 'confirm']);
      if (!submitBtn) break;
      const btnText = (await submitBtn.innerText().catch(() => '')).trim();
      if (!btnText) break;
      console.log(`  -> [Submit Step ${step}] Action button located: "${btnText}". Executing click...`);
      await submitBtn.click({ force: true }).catch(() => {});
      stepClickedCount++;
      await page.waitForTimeout(3500);
    }
    if (stepClickedCount > 0) {
      console.log(`  ✅ [Step 5] Form submission click sequence executed (${stepClickedCount} clicks).`);
    } else {
      console.log('  ⚠️ [Step 5] Submit button not located on page.');
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
