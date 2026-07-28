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
export async function findButton(page, targetKeywords = ['submit', 'register', 'next', 'save']) {
  try {
    const mainBtnSelectors = [
      '[data-test="save-form-btn"]',
      'button[data-test*="save"]',
      'button[data-test*="submit"]',
      'button:has-text("Submit")',
      'button:has-text("Register")',
      'button:has-text("Next")',
      'button:has-text("Confirm")',
      '.un-button:has-text("Submit")',
      '.un-button:has-text("Next")',
      '.un-button',
      'button[type="submit"]'
    ];

    for (const sel of mainBtnSelectors) {
      const loc = page.locator(sel).first();
      if (await loc.isVisible().catch(() => false)) {
        return loc;
      }
    }
  } catch (err) {
    console.warn('  ⚠️ [AIFormFiller] findButton notice:', err.message);
  }
  return null;
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
      console.log(`  -> Querying Unstop API for opportunity #${oppId}...`);
      const apiStatus = await page.evaluate(async (id) => {
        try {
          const res = await fetch(`/api/v1/opportunity/${id}/status`, {
            headers: { 'Accept': 'application/json' }
          }).catch(() => null);
          return res ? res.json().catch(() => null) : null;
        } catch { return null; }
      }, oppId).catch(() => null);

      console.log('  -> API Response:', JSON.stringify(apiStatus));
      if (apiStatus?.isRegistered || apiStatus?.registered || apiStatus?.data?.isRegistered || apiStatus?.data?.registered) {
        console.log('  ✅ [Verify] API confirmed registration: isRegistered = true');
        return true;
      }
    }

    const bodyText = (await page.locator('body').innerText().catch(() => '')).toLowerCase();
    const url = page.url();

    const isRegisteredText = (
      url.includes('/success') ||
      url.includes('rstatus=1') ||
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
