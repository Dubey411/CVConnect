import axios from 'axios';
import { prisma } from '../lib/prisma.js';
import { analyzeText } from './mlClient.js';

export class JobFinderService {
  /**
   * Search live job platforms (Unstop, Internshala, public job APIs) for jobs matching candidate skills
   */
  async discoverJobsForCandidate(userId, resumeSkills = [], candidateTitle = 'Software Developer') {
    const primarySkill = resumeSkills.length > 0 ? resumeSkills[0] : candidateTitle;
    console.log(`🔍 [JobFinder] Searching live opportunities on Unstop for: "${primarySkill}"...`);

    const discoveredMap = new Map();

    const fetchCategory = async (opportunityType) => {
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
              if (!item.title) continue;

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
                  platform: 'unstop',
                  skills
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn(`[JobFinder] Unstop ${opportunityType} search error:`, err.message);
      }
    };

    // Search both jobs and internships on Unstop
    await Promise.all([
      fetchCategory('jobs'),
      fetchCategory('internships')
    ]);

    const discovered = Array.from(discoveredMap.values());
    console.log(`✅ [JobFinder] Found ${discovered.length} distinct live Unstop opportunities.`);

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
            targetUrl: jobData.targetUrl
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
