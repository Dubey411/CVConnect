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

// ─── Browser-like headers to avoid bot detection ───────────────────────────
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/html, */*',
  'Accept-Language': 'en-IN,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br'
};

// ─── Helper: parse Indeed RSS XML to job objects ───────────────────────────
function parseIndeedRSS(xml) {
  const jobs = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag) => {
      const m = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(block);
      return m ? (m[1] || m[2] || '').trim() : '';
    };
    const title = get('title');
    const company = get('source');
    const link = get('link') || get('guid');
    const description = get('description').replace(/<[^>]+>/g, ' ').slice(0, 600);
    if (title && link) {
      jobs.push({ title, company: company || 'Company via Indeed', link, description });
    }
  }
  return jobs;
}

export class JobFinderService {
  /**
   * Search Unstop, Internshala, Indeed India, and optionally Adzuna
   * for live jobs/internships matching candidate's resume skills.
   */
  async discoverJobsForCandidate(userId, resumeSkills = [], candidateTitle = 'Software Developer') {
    const primarySkill = resumeSkills.length > 0 ? resumeSkills[0] : candidateTitle;
    const secondarySkill = resumeSkills.length > 1 ? resumeSkills[1] : '';
    const searchQuery = resumeSkills.slice(0, 3).join(' ').trim() || candidateTitle;

    console.log(`🔍 [JobFinder] Searching Unstop + Internshala + Indeed India for: "${searchQuery}"`);

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
            const skills = (item.job_detail?.skills || item.skills || []).map(s => (typeof s === 'string' ? s : s.name) || '').filter(Boolean);
            const description = `${title} at ${company}. Skills: ${skills.join(', ') || primarySkill}. ${(item.details || item.about_opportunity || '').slice(0, 300)}`;
            discoveredMap.set(key, { title, company, targetUrl, description, platform: 'Unstop', skills });
            count++;
          }
        }
        console.log(`  📌 Unstop ${opportunityType}: ${count} results`);
      } catch (err) {
        console.warn(`  ⚠️  Unstop ${opportunityType}:`, err.message);
      }
    };

    // ── 2. INTERNSHALA — Internal AJAX endpoint ────────────────────────────
    const fetchInternshala = async () => {
      const skillSlug = primarySkill.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const urls = [
        `https://internshala.com/internships/${skillSlug}-internship/`,
        `https://internshala.com/jobs/${skillSlug}-jobs/`,
        `https://internshala.com/internships/keywords-${encodeURIComponent(primarySkill)}/`
      ];

      // Try the internal AJAX data endpoint that Internshala itself uses
      const ajaxUrls = [
        `https://internshala.com/internships_ajax/${skillSlug}-internship/`,
        `https://internshala.com/internships_ajax/keywords-${encodeURIComponent(primarySkill)}/`
      ];

      let count = 0;
      for (const ajaxUrl of ajaxUrls) {
        try {
          const res = await axios.get(ajaxUrl, {
            headers: {
              ...BROWSER_HEADERS,
              'Referer': 'https://internshala.com/internships/',
              'X-Requested-With': 'XMLHttpRequest'
            },
            timeout: 10000
          });

          // Internshala returns HTML fragment or JSON
          const html = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);

          // Parse internship cards from HTML
          const cardRegex = /data-internshipid="(\d+)"[\s\S]*?<div[^>]*class="[^"]*company-name[^"]*"[^>]*>\s*<[^>]+>\s*([^<]+)/g;
          const titleRegex = /<h3[^>]*class="[^"]*job-internship-name[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/g;
          const linkRegex = /href="(\/internship\/detail\/[^"]+)"/g;
          const stipendRegex = /class="stipend"[^>]*>([^<]+)/g;

          // Extract titles + links using a simpler approach
          const internshipMatches = html.matchAll(/<a[^>]+href="(\/internship\/detail\/[^"]+)"[^>]*>([^<]+)<\/a>/g);
          for (const m of internshipMatches) {
            const link = `https://internshala.com${m[1]}`;
            const rawTitle = m[2].trim();
            if (!rawTitle || rawTitle.length < 4) continue;
            if (!isRelevantForCandidate(rawTitle, primarySkill)) continue;

            const companyMatch = html.slice(html.indexOf(m[0]), html.indexOf(m[0]) + 800).match(/class="[^"]*company-name[^"]*"[\s\S]*?>\s*<[^>]+>\s*([^<\n]{2,60})/);
            const company = companyMatch ? companyMatch[1].trim() : 'Company via Internshala';

            const key = `${rawTitle.toLowerCase()}::${company.toLowerCase()}`;
            if (!discoveredMap.has(key)) {
              discoveredMap.set(key, {
                title: rawTitle,
                company,
                targetUrl: link,
                description: `${rawTitle} internship at ${company}. Required: ${primarySkill}. Apply on Internshala.`,
                platform: 'Internshala',
                skills: [primarySkill, secondarySkill].filter(Boolean)
              });
              count++;
            }
          }

          if (count > 0) break; // Got results, stop trying alternate URLs
        } catch (err) {
          // Try next URL
        }
      }

      // Fallback: if AJAX blocked, create search-URL based placeholder entries
      // so the user can at least click to view results on Internshala directly
      if (count === 0) {
        const searchUrl = `https://internshala.com/internships/keywords-${encodeURIComponent(primarySkill)}/`;
        const key = `internshala-search::${primarySkill.toLowerCase()}`;
        if (!discoveredMap.has(key)) {
          discoveredMap.set(key, {
            title: `${primarySkill} Internship Opportunities`,
            company: 'Various Companies — Internshala',
            targetUrl: searchUrl,
            description: `Browse all ${primarySkill} internship opportunities on Internshala. Click to view live listings with stipend, duration, and eligibility details.`,
            platform: 'Internshala',
            skills: [primarySkill, secondarySkill].filter(Boolean),
            isSearchLink: true
          });
          count = 1;
        }
      }
      console.log(`  📌 Internshala: ${count} results`);
    };

    // ── 3. INDEED INDIA — RSS Feed (no API key needed) ─────────────────────
    const fetchIndeedIndia = async () => {
      let count = 0;
      const queries = [primarySkill, secondarySkill].filter(Boolean);

      for (const query of queries) {
        try {
          const rssUrl = `https://in.indeed.com/rss?q=${encodeURIComponent(query)}&l=India&sort=date`;
          const res = await axios.get(rssUrl, {
            headers: {
              ...BROWSER_HEADERS,
              'Accept': 'application/rss+xml, application/xml, text/xml, */*'
            },
            timeout: 10000,
            responseType: 'text'
          });

          const jobs = parseIndeedRSS(res.data);
          for (const job of jobs) {
            if (!isRelevantForCandidate(job.title, primarySkill)) continue;
            const key = `${job.title.toLowerCase()}::${job.company.toLowerCase()}`;
            if (!discoveredMap.has(key)) {
              discoveredMap.set(key, {
                title: job.title,
                company: job.company,
                targetUrl: job.link,
                description: `${job.title} at ${job.company}. ${job.description}`,
                platform: 'Indeed India',
                skills: [primarySkill, secondarySkill].filter(Boolean)
              });
              count++;
            }
          }
        } catch (err) {
          console.warn(`  ⚠️  Indeed India (${query}):`, err.message);
        }
      }

      // Fallback search link if RSS blocked
      if (count === 0) {
        const key = `indeed-search::${primarySkill.toLowerCase()}`;
        discoveredMap.set(key, {
          title: `${primarySkill} Jobs & Internships`,
          company: 'Various Companies — Indeed India',
          targetUrl: `https://in.indeed.com/jobs?q=${encodeURIComponent(primarySkill)}&l=India`,
          description: `Browse ${primarySkill} jobs and internships across India on Indeed. Click to view real live postings with salary, location, and company details.`,
          platform: 'Indeed India',
          skills: [primarySkill, secondarySkill].filter(Boolean),
          isSearchLink: true
        });
        count = 1;
      }
      console.log(`  📌 Indeed India: ${count} results`);
    };

    // ── 4. ADZUNA INDIA — Official free API (optional, needs .env key) ──────
    const fetchAdzunaIndia = async () => {
      const appId = process.env.ADZUNA_APP_ID;
      const appKey = process.env.ADZUNA_APP_KEY;
      if (!appId || !appKey) {
        console.log(`  ℹ️  Adzuna: No API key — skipped (add ADZUNA_APP_ID + ADZUNA_APP_KEY to .env for Glassdoor-aggregated results)`);
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
        console.log(`  📌 Adzuna India: ${count} results`);
      } catch (err) {
        console.warn('  ⚠️  Adzuna India:', err.message);
      }
    };

    // ── 5. LINKEDIN — Deep search link (no API, opens real search) ──────────
    const addLinkedInSearchLink = () => {
      const linkedInUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(searchQuery)}&location=India&f_E=1,2&f_JT=I,F`;
      const glassdoorUrl = `https://www.glassdoor.co.in/Job/india-${primarySkill.toLowerCase().replace(/\s+/g, '-')}-jobs-SRCH_IL.0,5_IN115_KO6,${6 + primarySkill.length}.htm`;

      const liKey = `linkedin-search::${primarySkill.toLowerCase()}`;
      discoveredMap.set(liKey, {
        title: `${primarySkill} Roles on LinkedIn`,
        company: 'Multiple Companies — LinkedIn India',
        targetUrl: linkedInUrl,
        description: `Click to view live ${primarySkill} job openings on LinkedIn India, filtered for Entry Level and Internship positions matching your skills.`,
        platform: 'LinkedIn',
        skills: [primarySkill, secondarySkill].filter(Boolean),
        isSearchLink: true
      });

      const gdKey = `glassdoor-search::${primarySkill.toLowerCase()}`;
      discoveredMap.set(gdKey, {
        title: `${primarySkill} Opportunities on Glassdoor`,
        company: 'Multiple Companies — Glassdoor India',
        targetUrl: glassdoorUrl,
        description: `Click to view ${primarySkill} job openings with salary insights and company reviews on Glassdoor India.`,
        platform: 'Glassdoor',
        skills: [primarySkill, secondarySkill].filter(Boolean),
        isSearchLink: true
      });
      console.log(`  📌 LinkedIn + Glassdoor: search links added`);
    };

    // ── Execute all searches in parallel ────────────────────────────────────
    await Promise.all([
      fetchUnstop('jobs'),
      fetchUnstop('internships'),
      fetchInternshala(),
      fetchIndeedIndia(),
      fetchAdzunaIndia()
    ]);
    addLinkedInSearchLink();

    const discovered = Array.from(discoveredMap.values());
    const platforms = [...new Set(discovered.map(d => d.platform))].join(', ');
    console.log(`✅ [JobFinder] Found ${discovered.length} opportunities across: ${platforms}`);

    // ── Save discovered jobs to DB (no duplicates) ─────────────────────────
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
