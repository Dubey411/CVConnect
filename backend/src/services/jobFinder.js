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

// ─── Extract company from Internshala detail URL slug ─────────────────────────
function extractCompanyFromUrl(url) {
  if (!url || !url.includes('-at-')) return 'Internshala Partner';
  try {
    const afterAt = url.split('-at-')[1] || '';
    const rawCompany = afterAt.replace(/\d+$/, '').replace(/-/g, ' ');
    return rawCompany.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ').trim();
  } catch (e) {
    return 'Internshala Partner';
  }
}

// ─── Browser-like headers ───────────────────────────────────────────────────
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/html, */*',
  'Accept-Language': 'en-IN,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br'
};

// ─── Parse Internshala AJAX JSON response ────────────────────────────────────
function parseInternshalaHTML(html) {
  const results = [];
  if (!html || typeof html !== 'string') return results;

  const regex = /class="[^"]*job-internship-name[^"]*"[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const href = m[1].trim();
    const title = m[2].trim();
    if (!title || title.length < 3) continue;

    const link = href.startsWith('http') ? href : `https://internshala.com${href}`;

    // Extract company name using URL slug or HTML snippet
    const company = extractCompanyFromUrl(link);
    results.push({ title, company, link });
  }
  return results;
}

export class JobFinderService {
  /**
   * Search Unstop, Internshala, and platform links for live active jobs/internships matching candidate's resume skills.
   */
  async discoverJobsForCandidate(userId, resumeSkills = [], candidateTitle = 'Software Developer') {
    const primarySkill = resumeSkills.length > 0 ? resumeSkills[0] : candidateTitle;
    const secondarySkill = resumeSkills.length > 1 ? resumeSkills[1] : '';
    const searchQuery = resumeSkills.slice(0, 3).join(' ').trim() || candidateTitle;

    console.log(`\n🔍 [JobFinder] Searching across platforms for: "${searchQuery}"`);
    const discoveredMap = new Map();

    // ── 1. UNSTOP — Filter ONLY LIVE & OPEN Opportunities ─────────────────
    const fetchUnstop = async (opportunityType) => {
      try {
        const res = await axios.get('https://unstop.com/api/public/opportunity/search-result', {
          params: { opportunity: opportunityType, searchTerm: primarySkill, per_page: 25 },
          headers: BROWSER_HEADERS,
          timeout: 12000
        });

        const items = res.data?.data?.data || res.data?.data || [];
        if (!Array.isArray(items)) return;

        let count = 0;
        const now = new Date();

        for (const item of items) {
          if (!item.title || !isRelevantForCandidate(item.title, primarySkill)) continue;

          // 🛑 CRITICAL FILTER: Skip expired, closed, or filled Unstop opportunities
          if (item.regn_open === 0) continue;
          if (item.status && item.status.toUpperCase() !== 'LIVE') continue;
          if (item.end_date && new Date(item.end_date) < now) continue;
          if (item.expired === true) continue;

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
        console.log(`  ✅ Unstop ${opportunityType} (Live/Open only): ${count} listings`);
      } catch (err) {
        console.warn(`  ⚠️  Unstop ${opportunityType}: ${err.message}`);
      }
    };

    // ── 2. INTERNSHALA — Live AJAX listings (40+ live positions) ────────────
    const fetchInternshala = async () => {
      const skillSlug = primarySkill.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const attempts = [
        `https://internshala.com/internships_ajax/${skillSlug}-internship/`,
        `https://internshala.com/internships_ajax/keywords-${encodeURIComponent(primarySkill)}/`,
        `https://internshala.com/internships_ajax/web-development-internship/`,
        `https://internshala.com/internships_ajax/software-development-internship/`
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
          if (count >= 10) break; // Obtained rich set of active Internshala listings
        } catch (err) {
          console.warn(`  ⚠️  Internshala (${url.slice(30)}): ${err.message}`);
        }
      }

      console.log(`  ✅ Internshala (Active live listings): ${count} listings`);
    };

    // ── 3. LINKEDIN & GLASSDOOR — Deep links for active hiring ─────────────
    const addPlatformSearchLinks = () => {
      const linkedInUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(searchQuery)}&location=India&f_E=1,2&f_JT=I,F`;
      const glassdoorUrl = `https://www.glassdoor.co.in/Job/india-${primarySkill.toLowerCase().replace(/\s+/g, '-')}-jobs-SRCH_IL.0,5_IN115_KO6,${6 + primarySkill.length}.htm`;

      discoveredMap.set(`linkedin::${primarySkill}`, {
        title: `${primarySkill} Entry-Level Jobs on LinkedIn India`,
        company: 'Multiple Companies — LinkedIn',
        targetUrl: linkedInUrl,
        description: `Live ${primarySkill} job openings on LinkedIn India, filtered for active fresher and internship roles.`,
        platform: 'LinkedIn',
        skills: [primarySkill, secondarySkill].filter(Boolean),
        isSearchLink: true
      });

      discoveredMap.set(`glassdoor::${primarySkill}`, {
        title: `${primarySkill} Openings on Glassdoor India`,
        company: 'Multiple Companies — Glassdoor',
        targetUrl: glassdoorUrl,
        description: `${primarySkill} job openings with salary insights and company reviews on Glassdoor India.`,
        platform: 'Glassdoor',
        skills: [primarySkill, secondarySkill].filter(Boolean),
        isSearchLink: true
      });

      console.log(`  ✅ LinkedIn + Glassdoor: live search links added`);
    };

    // ── Execute all in parallel ─────────────────────────────────────────────
    await Promise.all([
      fetchUnstop('jobs'),
      fetchUnstop('internships'),
      fetchInternshala()
    ]);
    addPlatformSearchLinks();

    const discovered = Array.from(discoveredMap.values());
    const platforms = [...new Set(discovered.map(d => d.platform))].join(', ');
    console.log(`\n✅ [JobFinder] Total: ${discovered.length} active opportunities across ${platforms}\n`);

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
