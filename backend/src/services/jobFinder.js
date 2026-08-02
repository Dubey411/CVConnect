import axios from 'axios';
import { prisma } from '../lib/prisma.js';
import { analyzeText } from './mlClient.js';

export class JobFinderService {
  /**
   * Search live job platforms (Unstop, Internshala, public job APIs) for jobs matching candidate skills
   */
  async discoverJobsForCandidate(userId, resumeSkills = [], candidateTitle = 'Software Developer') {
    const searchTerms = resumeSkills.length > 0 
      ? resumeSkills.slice(0, 3).join(' ') 
      : candidateTitle;

    console.log(`🔍 [JobFinder] Searching live opportunities for skills: "${searchTerms}"...`);

    const discovered = [];

    // 1. Search Unstop Live Opportunities via Public API
    try {
      const unstopRes = await axios.get('https://unstop.com/api/public/opportunity/search-result', {
        params: {
          opportunity: 'internships',
          searchTerm: searchTerms,
          per_page: 15
        },
        timeout: 10000
      }).catch(() => null);

      if (unstopRes?.data?.data?.data) {
        const items = unstopRes.data.data.data;
        for (const item of items) {
          if (!item.title) continue;

          const title = item.title.trim();
          const company = item.organisation?.name || item.company_name || 'Unstop Partner';
          const targetUrl = item.seo_url || `https://unstop.com/o/${item.id}`;
          const description = `${title} position at ${company}. Required skills and qualifications: ${(item.job_detail?.skills || item.skills || []).map(s => s.name || s).join(', ') || searchTerms}. ${item.details || item.about_opportunity || ''}`;

          discovered.push({
            title,
            company,
            targetUrl,
            description,
            platform: 'unstop',
            skills: (item.job_detail?.skills || item.skills || []).map(s => s.name || s)
          });
        }
      }
    } catch (err) {
      console.warn('[JobFinder] Unstop search failed (non-fatal):', err.message);
    }

    // 2. Fallback / Search Unstop Hackathons & Hiring Challenges
    if (discovered.length < 5) {
      try {
        const unstopJobsRes = await axios.get('https://unstop.com/api/public/opportunity/search-result', {
          params: {
            opportunity: 'jobs',
            searchTerm: searchTerms,
            per_page: 10
          },
          timeout: 10000
        }).catch(() => null);

        if (unstopJobsRes?.data?.data?.data) {
          const items = unstopJobsRes.data.data.data;
          for (const item of items) {
            if (!item.title) continue;

            const title = item.title.trim();
            const company = item.organisation?.name || item.company_name || 'Unstop Partner';
            const targetUrl = item.seo_url || `https://unstop.com/o/${item.id}`;
            const description = `${title} at ${company}. ${item.details || ''}`;

            discovered.push({
              title,
              company,
              targetUrl,
              description,
              platform: 'unstop',
              skills: (item.skills || []).map(s => s.name || s)
            });
          }
        }
      } catch (_) {}
    }

    console.log(`✅ [JobFinder] Discovered ${discovered.length} live opportunities.`);

    // 3. Save discovered jobs to Database for candidate
    const savedJobs = [];
    for (const jobData of discovered) {
      try {
        // Avoid duplicate jobs for same user & title
        const existing = await prisma.job.findFirst({
          where: { userId, title: jobData.title, company: jobData.company }
        });

        if (existing) {
          savedJobs.push(existing);
        } else {
          const nlp = await analyzeText(jobData.description).catch(() => ({ skills: jobData.skills || [] }));
          const requirements = {
            responsibilities: [jobData.description.slice(0, 200)],
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
        console.warn('[JobFinder] Failed to save job:', err.message);
      }
    }

    return savedJobs;
  }
}
