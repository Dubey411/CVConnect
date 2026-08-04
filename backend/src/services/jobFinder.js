import axios from 'axios';
import { prisma } from '../lib/prisma.js';
import { analyzeText } from './mlClient.js';

// ─── Non-tech role filter ───────────────────────────────────────────────────
const NON_TECH_REGEX = /\b(sales|marketing|telecaller|tele-caller|receptionist|hr intern|recruiter|call center|customer care|bpo|business development associate|bda|growth associate|content writer|social media)\b/i;

function isRelevantForCandidate(title, primarySkill) {
  if (!title) return false;
  const isCandidateTech = /react|node|python|javascript|developer|engineer|software|full.?stack|frontend|backend|java\b|c\+\+|coder|data science|machine learning|ml|ai\b|flutter|android|ios/i.test(primarySkill);
  if (isCandidateTech && NON_TECH_REGEX.test(title)) return false;
  return true;
}

// ─── Browser-like headers ───────────────────────────────────────────────────
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/html, */*',
  'Accept-Language': 'en-IN,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br'
};

// ─── Parse Internshala AJAX JSON response ────────────────────────────────────
// Internshala returns JSON: { internship_list_html: "<html fragment>" }
function parseInternshalaHTML(html) {
  const results = [];
  if (!html || typeof html !== 'string') return results;

  // Match individual internship cards: each has a container with data-internshipid
  // Extract: title from .job-internship-name a, company from .company-name, link from href
  const titleRegex = /<h3[^>]*class="[^"]*job-internship-name[^"]*"[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
  let m;
  while ((m = titleRegex.exec(html)) !== null) {
    const href = m[1].trim();
    const title = m[2].trim();
    if (!title || title.length < 3) continue;

    const link = href.startsWith('http') ? href : `https://internshala.com${href}`;

    // Look forward in the HTML (within 1000 chars) for company name
    const chunk = html.slice(m.index, m.index + 1000);
    const companyMatch = chunk.match(/class="[^"]*company-name[^"]*"[^>]*>\s*<[^>]+>\s*([^<\n]{2,80})/i)
      || chunk.match(/class="[^"]*company[^"]*"[^>]*>([^<\n]{2,60})/i);
    const company = companyMatch ? companyMatch[1].replace(/&amp;/g, '&').trim() : 'Company via Internshala';

    results.push({ title, company, link });
  }
  return results;
}

export class JobFinderService {
  /**
   * Search Unstop, Internshala, and optionally Adzuna/JSearch
   * for live jobs/internships matching candidate's resume skills.
   */
  async discoverJobsForCandidate(userId, resumeSkills = [], candidateTitle = 'Software Developer') {
    const primarySkill = resumeSkills.length > 0 ? resumeSkills[0] : candidateTitle;
    const secondarySkill = resumeSkills.length > 1 ? resumeSkills[1] : '';
    const searchQuery = resumeSkills.slice(0, 3).join(' ').trim() || candidateTitle;

    console.log(`\n🔍 [JobFinder] Searching across platforms for: "${searchQuery}"`);
    const discoveredMap = new Map();

    // ── 1. UNSTOP — Public search API (Jobs + Internships) ─────────────────
    const fetchUnstop = async (opportunityType) => {
      try {
        const res = await axios.get('https://unstop.com/api/public/opportunity/search-result', {
          params: { opportunity: opportunityType, searchTerm: primarySkill, per_page: 15 },
          headers: BROWSER_HEADERS,
          timeout: 12000
        });

        const items = res.data?.data?.data || res.data?.data || [];
        if (!Array.isArray(items)) return;

        let count = 0;
        for (const item of items) {
          if (!item.title || !isRelevantForCandidate(item.title, primarySkill)) continue;

          const title = item.title.trim();
          const company = item.organisation?.name || item.company_name || 'Unstop Partner';
          const rawSeo = item.public_url || item.seo_url || item.site_url;
          let targetUrl = `https://unstop.com/o/${item.id}`;
          if (rawSeo) targetUrl = rawSeo.startsWith('http') ? rawSeo : `https://unstop.com/${rawSeo}`;

          const key = `${title.toLowerCase()}::${company.toLowerCase()}`;
          if (!discoveredMap.has(key)) {
            const skills = (item.job_detail?.skills || item.skills || [])
              .map(s => (typeof s === 'string' ? s : s.name) || '').filter(Boolean);
            const description = `${title} at ${company}. Skills: ${skills.join(', ') || primarySkill}. ${(item.details || item.about_opportunity || '').slice(0, 300)}`;
            discoveredMap.set(key, { title, company, targetUrl, description, platform: 'Unstop', skills });
            count++;
          }
        }
        console.log(`  ✅ Unstop ${opportunityType}: ${count} listings`);
      } catch (err) {
        console.warn(`  ⚠️  Unstop ${opportunityType}: ${err.message}`);
      }
    };

    // ── 2. INTERNSHALA — AJAX endpoint (confirmed working) ──────────────────
    const fetchInternshala = async () => {
      // Internshala AJAX returns JSON: { internship_list_html: "<html>" }
      const skillSlug = primarySkill.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const attempts = [
        `https://internshala.com/internships_ajax/${skillSlug}-internship/`,
        `https://internshala.com/internships_ajax/keywords-${encodeURIComponent(primarySkill)}/`,
        `https://internshala.com/internships_ajax/javascript-internship/`, // fallback common skill
      ];

      let count = 0;
      for (const url of attempts) {
        try {
          const res = await axios.get(url, {
            headers: {
              ...BROWSER_HEADERS,
              'X-Requested-With': 'XMLHttpRequest',
              'Referer': 'https://internshala.com/internships/'
            },
            timeout: 12000
          });

          // Internshala returns JSON with internship_list_html
          const html = res.data?.internship_list_html || res.data?.jobs_list_html || (typeof res.data === 'string' ? res.data : '');
          if (!html) continue;

          const listings = parseInternshalaHTML(html);
          for (const item of listings) {
            if (!isRelevantForCandidate(item.title, primarySkill)) continue;
            const key = `${item.title.toLowerCase()}::${item.company.toLowerCase()}`;
            if (!discoveredMap.has(key)) {
              discoveredMap.set(key, {
                title: item.title,
                company: item.company,
                targetUrl: item.link,
                description: `${item.title} internship at ${item.company}. Apply on Internshala. Required skills: ${primarySkill}.`,
                platform: 'Internshala',
                skills: [primarySkill, secondarySkill].filter(Boolean)
              });
              count++;
            }
          }
          if (count > 0) break; // success — no need to try next URL
        } catch (err) {
          console.warn(`  ⚠️  Internshala (${url.slice(30)}): ${err.message}`);
        }
      }

      // Always add search link so user can open Internshala directly
      const searchUrl = `https://internshala.com/internships/keywords-${encodeURIComponent(primarySkill)}/`;
      const key = `internshala-search::${primarySkill.toLowerCase()}`;
      if (!discoveredMap.has(key)) {
        discoveredMap.set(key, {
          title: `${primarySkill} Internships — Browse All`,
          company: 'Multiple Companies via Internshala',
          targetUrl: searchUrl,
          description: `Browse all ${primarySkill} internships with stipend and eligibility info on Internshala.`,
          platform: 'Internshala',
          skills: [primarySkill, secondarySkill].filter(Boolean),
          isSearchLink: true
        });
      }
      console.log(`  ✅ Internshala: ${count} real listings + search link`);
    };

    // ── 3. ADZUNA INDIA — Official free API ────────────────────────────────
    const fetchAdzunaIndia = async () => {
      const appId = process.env.ADZUNA_APP_ID;
      const appKey = process.env.ADZUNA_APP_KEY;
      if (!appId || !appKey) {
        console.log(`  ℹ️  Adzuna: No API key — add ADZUNA_APP_ID + ADZUNA_APP_KEY to .env (free at developer.adzuna.com)`);
        return;
      }
      try {
        const res = await axios.get('https://api.adzuna.com/v1/api/jobs/in/search/1', {
          params: {
            app_id: appId,
            app_key: appKey,
            what: searchQuery,
            where: 'India',
            results_per_page: 15,
            'content-type': 'application/json'
          },
          timeout: 10000
        });

        const items = res.data?.results || [];
        let count = 0;
        for (const item of items) {
          if (!item.title || !isRelevantForCandidate(item.title, primarySkill)) continue;
          const title = item.title.trim();
          const company = item.company?.display_name || 'Adzuna Partner';
          const key = `${title.toLowerCase()}::${company.toLowerCase()}`;
          if (!discoveredMap.has(key)) {
            discoveredMap.set(key, {
              title,
              company,
              targetUrl: item.redirect_url || `https://www.adzuna.in/search?q=${encodeURIComponent(title)}`,
              description: `${title} at ${company}. ${(item.description || '').slice(0, 500)}`,
              platform: 'Adzuna',
              skills: [primarySkill, secondarySkill].filter(Boolean)
            });
            count++;
          }
        }
        console.log(`  ✅ Adzuna India: ${count} listings`);
      } catch (err) {
        console.warn(`  ⚠️  Adzuna: ${err.message}`);
      }
    };

    // ── 4. LINKEDIN + GLASSDOOR — Deep search links ─────────────────────────
    const addPlatformSearchLinks = () => {
      const linkedInUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(searchQuery)}&location=India&f_E=1,2&f_JT=I,F`;
      const glassdoorUrl = `https://www.glassdoor.co.in/Job/india-${primarySkill.toLowerCase().replace(/\s+/g, '-')}-jobs-SRCH_IL.0,5_IN115_KO6,${6 + primarySkill.length}.htm`;
      const internshalaJobsUrl = `https://internshala.com/jobs/keywords-${encodeURIComponent(primarySkill)}/`;

      discoveredMap.set(`linkedin::${primarySkill}`, {
        title: `${primarySkill} Jobs on LinkedIn India`,
        company: 'Multiple Companies — LinkedIn',
        targetUrl: linkedInUrl,
        description: `Live ${primarySkill} job openings on LinkedIn India, filtered for fresher and internship roles.`,
        platform: 'LinkedIn',
        skills: [primarySkill, secondarySkill].filter(Boolean),
        isSearchLink: true
      });

      discoveredMap.set(`glassdoor::${primarySkill}`, {
        title: `${primarySkill} Jobs on Glassdoor India`,
        company: 'Multiple Companies — Glassdoor',
        targetUrl: glassdoorUrl,
        description: `${primarySkill} job openings with salary insights and company reviews on Glassdoor India.`,
        platform: 'Glassdoor',
        skills: [primarySkill, secondarySkill].filter(Boolean),
        isSearchLink: true
      });

      discoveredMap.set(`internshala-jobs::${primarySkill}`, {
        title: `${primarySkill} Jobs on Internshala`,
        company: 'Multiple Companies — Internshala Jobs',
        targetUrl: internshalaJobsUrl,
        description: `Full-time ${primarySkill} job openings listed on Internshala for freshers.`,
        platform: 'Internshala',
        skills: [primarySkill, secondarySkill].filter(Boolean),
        isSearchLink: true
      });

      console.log(`  ✅ LinkedIn + Glassdoor + Internshala Jobs: search links added`);
    };

    // ── Execute all in parallel ─────────────────────────────────────────────
    await Promise.all([
      fetchUnstop('jobs'),
      fetchUnstop('internships'),
      fetchInternshala(),
      fetchAdzunaIndia()
    ]);
    addPlatformSearchLinks();

    const discovered = Array.from(discoveredMap.values());
    const platforms = [...new Set(discovered.map(d => d.platform))].join(', ');
    console.log(`\n✅ [JobFinder] Total: ${discovered.length} opportunities across ${platforms}\n`);

    // ── Save to DB (no duplicates) ─────────────────────────────────────────
    const savedJobs = [];
    for (const jobData of discovered) {
      try {
        const existing = await prisma.job.findFirst({
          where: { userId, title: jobData.title, company: jobData.company }
        });

        if (existing) {
          savedJobs.push(existing);
        } else {
          const nlp = await analyzeText(jobData.description).catch(() => ({ skills: jobData.skills || [] }));
          const newJob = await prisma.job.create({
            data: {
              userId,
              title: jobData.title,
              company: jobData.company,
              description: jobData.description,
              skills: nlp.skills?.length ? nlp.skills : (jobData.skills || []),
              requirements: {
                responsibilities: [jobData.description.slice(0, 250)],
                mustHave: nlp.skills || jobData.skills || [],
                targetUrl: jobData.targetUrl,
                platform: jobData.platform,
                isSearchLink: jobData.isSearchLink || false
              }
            }
          });
          savedJobs.push(newJob);
        }
      } catch (err) {
        console.warn('[JobFinder] Save notice:', err.message);
      }
    }

    return savedJobs;
  }
}
