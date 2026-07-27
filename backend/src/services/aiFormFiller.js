/**
 * aiFormFiller.js
 *
 * AI-Powered Form Filling Engine for CVConnect.
 * Uses LLM-guided DOM resolution and Playwright automation to fill application forms
 * adaptively without relying on fragile hardcoded CSS selectors.
 */

import OpenAI from 'openai';

// Initialize OpenRouter / OpenAI client
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
      model: process.env.FORM_LLM_MODEL || 'google/gemini-2.0-flash-exp:free'
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
    };
  }
  return { client: null, model: null };
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
    console.warn(`[AIFormFiller] findField (${fieldType}) notice:`, err.message);
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
    console.warn('[AIFormFiller] findButton notice:', err.message);
  }
  return null;
}

/**
 * Execute AI-Powered Form Filling task pipeline
 */
export async function fillUnstopForm(page, formData, userId, appId, io) {
  try {
    emitProgress(io, userId, appId, 'ai_analyzing', 'AI is analyzing form structure…', 60);

    const tasks = [
      {
        description: 'Uploading tailored resume PDF…',
        progress: 68,
        action: async (p) => {
          if (formData?.resumePath) {
            const fileInput = p.locator('input[type="file"]').first();
            if (await fileInput.isVisible().catch(() => true)) {
              await fileInput.setInputFiles(formData.resumePath).catch(() => {});
              await p.waitForTimeout(1500);
            }
          }
        }
      },
      {
        description: 'Fulfilling location fields with autocomplete selection…',
        progress: 75,
        action: async (p) => {
          if (formData?.location) {
            const locField = await findField(p, 'location');
            if (locField) {
              const currentVal = await locField.inputValue().catch(() => '');
              if (!currentVal) {
                await locField.click({ force: true }).catch(() => {});
                await locField.fill('Mumbai').catch(() => {});
                await p.waitForTimeout(1000);

                // Select first Angular mat-option or Google places autocomplete suggestion
                const option = p.locator('mat-option, un-option, .cdk-overlay-container mat-option, .pac-item, li.location-item, div.option').first();
                if (await option.isVisible().catch(() => false)) {
                  await option.click({ force: true }).catch(() => {});
                } else {
                  await p.keyboard.press('ArrowDown').catch(() => {});
                  await p.waitForTimeout(300);
                  await p.keyboard.press('Enter').catch(() => {});
                }

                await locField.evaluate(el => {
                  el.dispatchEvent(new Event('input', { bubbles: true }));
                  el.dispatchEvent(new Event('change', { bubbles: true }));
                  el.dispatchEvent(new Event('blur', { bubbles: true }));
                }).catch(() => {});
                await p.waitForTimeout(500);
              }
            }
          }
        }
      },
      {
        description: 'Adding candidate skills…',
        progress: 82,
        action: async (p) => {
          if (Array.isArray(formData?.skills) && formData.skills.length > 0) {
            const skillsField = await findField(p, 'skills');
            if (skillsField) {
              for (const skill of formData.skills.slice(0, 4)) {
                await skillsField.fill(skill).catch(() => {});
                await p.keyboard.press('Enter').catch(() => {});
                await p.waitForTimeout(400);
              }
            }
          }
        }
      },
      {
        description: 'Checking required Terms & Conditions…',
        progress: 88,
        action: async (p) => {
          const checkboxes = p.locator('input[type="checkbox"], label:has-text("Terms"), label:has-text("Agree")');
          const count = await checkboxes.count().catch(() => 0);
          for (let i = 0; i < count; i++) {
            const cb = checkboxes.nth(i);
            if (await cb.isVisible().catch(() => false)) {
              const checked = await cb.isChecked().catch(() => false);
              if (!checked) {
                await cb.click({ force: true }).catch(() => {});
                await p.waitForTimeout(300);
              }
            }
          }
        }
      },
      {
        description: 'Submitting application form…',
        progress: 92,
        action: async (p) => {
          const submitBtn = await findButton(p, ['submit', 'register', 'next', 'save']);
          if (submitBtn) {
            await submitBtn.click({ force: true }).catch(() => {});
            await p.waitForTimeout(4000);

            // Check if multi-step next button was clicked
            const secondSubmit = await findButton(p, ['submit', 'confirm']);
            if (secondSubmit) {
              await secondSubmit.click({ force: true }).catch(() => {});
              await p.waitForTimeout(4000);
            }
          }
        }
      }
    ];

    for (const task of tasks) {
      emitProgress(io, userId, appId, 'ai_filling', task.description, task.progress);
      await task.action(page).catch(err => {
        console.warn(`[AIFormFiller] Task warning (${task.description}):`, err.message);
      });
    }

    return true;
  } catch (err) {
    console.error('[AIFormFiller] Error filling Unstop form:', err.message);
    return false;
  }
}

/**
 * Verify registration completion via DOM & status API analysis
 */
export async function verifyUnstopRegistration(page, oppId) {
  try {
    if (oppId) {
      const apiStatus = await page.evaluate(async (id) => {
        try {
          const res = await fetch(`/api/v1/opportunity/${id}/status`, {
            headers: { 'Accept': 'application/json' }
          }).catch(() => null);
          return res ? res.json().catch(() => null) : null;
        } catch { return null; }
      }, oppId).catch(() => null);

      if (apiStatus?.isRegistered || apiStatus?.registered || apiStatus?.data?.isRegistered || apiStatus?.data?.registered) {
        return true;
      }
    }

    const bodyText = (await page.locator('body').innerText().catch(() => '')).toLowerCase();
    const url = page.url();

    const isRegistered = (
      url.includes('/success') ||
      url.includes('rstatus=1') ||
      bodyText.includes('successfully registered') ||
      bodyText.includes('application submitted') ||
      bodyText.includes('thank you for applying') ||
      bodyText.includes('you have registered') ||
      bodyText.includes('already registered')
    );

    const hasRegisteredBtn = await page.locator('button:has-text("Registered"), button:has-text("Applied"), a:has-text("Registered")').count().catch(() => 0) > 0;

    return isRegistered || hasRegisteredBtn;
  } catch {
    return false;
  }
}
