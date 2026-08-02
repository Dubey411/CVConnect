import axios from 'axios';
import { prisma } from '../lib/prisma.js';
import { analyzeText } from './mlClient.js';

const NON_TECH_REGEX = /\b(sales|marketing|telecaller|tele-caller|receptionist|hr intern|recruiter|call center|customer care|bpo|business development associate|bda)\b/i;

function isRelevantForCandidate(title, searchSkill) {
  if (!title) return false;
  const isCandidateTech = /react|node|python|javascript|developer|engineer|software|full stack|frontend|backend|java|c\+\+|coder|data/i.test(searchSkill);
  if (isCandidateTech && NON_TECH_REGEX.test(title)) {
    return false;
  }
  return true;
}

export class JobFinderService {
  /**
   * Search live job platforms (Unstop, Internshala, Remotive, Arbeitnow, etc.) for jobs matching candidate skills
   */
  async discoverJobsForCandidate(userId, resumeSkills = [], candidateTitle = 'Software Developer') {
    const primarySkill = resumeSkills.length > 0 ? resumeSkills[0] : candidateTitle;
    const secondarySkill = resumeSkills.length > 1 ? resumeSkills[1] : 'Developer';

    console.log(`🔍 [JobFinder] Aggregating multi-platform opportunities for skills: "${primarySkill}", "${secondarySkill}"...`);

    const discoveredMap = new Map();

    // 1. Unstop Live Opportunities (Jobs & Internships)
    const fetchUnstopCategory = async (opportunityType) => {
      try {
        const res = await axios.get('https://unstop.com/api/public/opportunity/search-result', {
          params: {
            opportunity: opportunityType,
            searchTerm: primarySkill,
            per_page: 15
          },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          timeout: 10000
        });

        if (res.data?.data) {
          const items = res.data.data.data || res.data.data;
          if (Array.isArray(items)) {
            for (const item of items) {
              if (!item.title || !isRelevantForCandidate(item.title, primarySkill)) continue;

              const title = item.title.trim();
              const company = item.organisation?.name || item.company_name || 'Unstop Partner';
              const rawSeo = item.public_url || item.seo_url || item.site_url;
              let targetUrl = `https://unstop.com/o/${item.id}`;
              if (rawSeo) {
                targetUrl = rawSeo.startsWith('http') ? rawSeo : `https://unstop.com/${rawSeo}`;
              }

              const key = `${title.toLowerCase()}::${company.toLowerCase()}`;
              if (!discoveredMap.has(key)) {
                const skills = (item.job_detail?.skills || item.skills || []).map(s => s.name || s);
                const description = `${title} position at ${company}. Required skills: ${skills.join(', ') || primarySkill}. ${item.details || item.about_opportunity || ''}`;

                discoveredMap.set(key, {
                  title,
                  company,
                  targetUrl,
                  description,
                  platform: 'Unstop',
                  skills
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn(`[JobFinder] Unstop ${opportunityType} notice:`, err.message);
      }
    };

    // 2. Remotive Live Remote Tech Jobs API
    const fetchRemotiveJobs = async () => {
      try {
        const res = await axios.get('https://remotive.com/api/remote-jobs', {
          params: { search: primarySkill, limit: 12 },
          timeout: 7000
        });

        if (res.data?.jobs && Array.isArray(res.data.jobs)) {
          for (const item of res.data.jobs) {
            if (!item.title || !isRelevantForCandidate(item.title, primarySkill)) continue;
            const title = item.title.trim();
            const company = item.company_name || 'Remote Partner';
            const targetUrl = item.url;
            const key = `${title.toLowerCase()}::${company.toLowerCase()}`;

            if (!discoveredMap.has(key)) {
              const tags = item.tags || [];
              const cleanDesc = (item.description || '').replace(/<[^>]*>?/gm, ' ').slice(0, 500);

              discoveredMap.set(key, {
                title,
                company,
                targetUrl,
                description: `${title} at ${company}. ${cleanDesc}`,
                platform: 'Remotive',
                skills: tags
              });
            }
          }
        }
      } catch (err) {
        console.warn('[JobFinder] Remotive notice:', err.message);
      }
    };

    // 3. Arbeitnow Tech Jobs API
    const fetchArbeitnowJobs = async () => {
      try {
        const res = await axios.get('https://www.arbeitnow.com/api/job-board-api', {
          timeout: 7000
        });

        if (res.data?.data && Array.isArray(res.data.data)) {
          for (const item of res.data.data) {
            if (!item.title || !isRelevantForCandidate(item.title, primarySkill)) continue;
            const title = item.title.trim();
            const company = item.company_name || 'Partner';
            const targetUrl = item.url;
            const key = `${title.toLowerCase()}::${company.toLowerCase()}`;

            // Filter relevant to candidate skills
            const matchesSkill = new RegExp(primarySkill, 'i').test(title + ' ' + (item.tags || []).join(' '));

            if (matchesSkill && !discoveredMap.has(key)) {
              const tags = item.tags || [];
              const cleanDesc = (item.description || '').replace(/<[^>]*>?/gm, ' ').slice(0, 500);

              discoveredMap.set(key, {
                title,
                company,
                targetUrl,
                description: `${title} at ${company}. ${cleanDesc}`,
                platform: 'Arbeitnow',
                skills: tags
              });
            }
          }
        }
      } catch (err) {
        console.warn('[JobFinder] Arbeitnow notice:', err.message);
      }
    };

    // Execute multi-platform search in parallel
    await Promise.all([
      fetchUnstopCategory('jobs'),
      fetchUnstopCategory('internships'),
      fetchRemotiveJobs(),
      fetchArbeitnowJobs()
    ]);

    const discovered = Array.from(discoveredMap.values());
    console.log(`✅ [JobFinder] Aggregated ${discovered.length} distinct live opportunities across Unstop, Remotive, & Arbeitnow.`);

    // Save discovered jobs to DB without creating duplicates
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
          const requirements = {
            responsibilities: [jobData.description.slice(0, 250)],
            mustHave: nlp.skills || jobData.skills || [],
            targetUrl: jobData.targetUrl,
            platform: jobData.platform
          };

          const newJob = await prisma.job.create({
            data: {
              userId,
              title: jobData.title,
              company: jobData.company,
              description: jobData.description,
              skills: nlp.skills || jobData.skills || [],
              requirements
            }
          });
          savedJobs.push(newJob);
        }
      } catch (err) {
        console.warn('[JobFinder] Save job notice:', err.message);
      }
    }

    return savedJobs;
  }
}
