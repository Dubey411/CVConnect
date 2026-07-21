import axios from 'axios';
import { load } from 'cheerio';

export class JobScraper {
  async scrape(url) {
    if (!url || typeof url !== 'string') {
      const err = new Error('A valid URL link is required.');
      err.status = 400;
      throw err;
    }

    let rawUrl = url.trim();
    if (!/^https?:\/\//i.test(rawUrl)) {
      rawUrl = `https://${rawUrl}`;
    }

    try {
      const parsedUrl = new URL(rawUrl);
      const { data: html } = await axios.get(parsedUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 12000,
        maxRedirects: 5
      });

      const $ = load(html);

      let title = '';
      let company = '';
      let description = '';

      // 0. Try Next.js SSR State (__NEXT_DATA__) used by Unstop and modern job boards
      const nextData = $('#__NEXT_DATA__').html();
      if (nextData) {
        try {
          const json = JSON.parse(nextData);
          const opp = json?.props?.pageProps?.opportunity || 
                      json?.props?.pageProps?.job || 
                      json?.props?.pageProps?.details || 
                      json?.props?.pageProps?.jobDetail;

          if (opp) {
            if (opp.title) title = opp.title;
            if (opp.organisation?.name || opp.company_name || opp.company?.name || opp.employer_name) {
              company = opp.organisation?.name || opp.company_name || opp.company?.name || opp.employer_name;
            }
            const rawDesc = opp.details || opp.description || opp.about || opp.about_job || opp.job_description;
            if (rawDesc) {
              description = load('<div>' + rawDesc + '</div>')('div').text().trim();
            }
          }
        } catch {
          // Ignore malformed Next.js state
        }
      }

      // 1. Try JSON-LD structured schema (@type === "JobPosting")
      if (!title || !description) {
        $('script[type="application/ld+json"]').each((_, element) => {
          try {
            const content = $(element).html();
            if (!content) return;
            const json = JSON.parse(content);
            const graph = Array.isArray(json) ? json : (json['@graph'] || [json]);
            for (const item of graph) {
              if (item && (item['@type'] === 'JobPosting' || item['@type']?.includes?.('JobPosting'))) {
                if (item.title && !title) title = item.title;
                if (item.hiringOrganization?.name && !company) company = item.hiringOrganization.name;
                if (item.description && !description) description = load('<div>' + item.description + '</div>')('div').text().trim();
              }
            }
          } catch {
            // Ignore malformed JSON-LD
          }
        });
      }

      // 2. OpenGraph / Twitter Meta Tags Fallback
      if (!title) {
        title = $('meta[property="og:title"]').attr('content') ||
                $('meta[name="twitter:title"]').attr('content') ||
                $('title').text().trim();
      }

      if (!company) {
        company = $('meta[property="og:site_name"]').attr('content') ||
                  $('meta[name="author"]').attr('content') ||
                  parsedUrl.hostname.replace(/^www\./i, '').split('.')[0];
      }

      if (!description) {
        description = $('meta[property="og:description"]').attr('content') ||
                      $('meta[name="description"]').attr('content') ||
                      $('meta[name="twitter:description"]').attr('content') || '';
      }

      // 3. Page Body Selector Fallbacks (Unstop, Internshala, LinkedIn, Indeed, Glassdoor)
      if (!description || description.length < 100) {
        const bodyText = $(
          '.show-more-less-html__markup, .jobDescriptionText, #job-description, .description, ' +
          '.job_details, .opportunity-details, .about-job, .details_container, .opportunity_container, ' +
          '.internship_details, .job-details, article, main'
        ).text().trim();
        
        if (bodyText && bodyText.length > description.length) {
          description = bodyText;
        }
      }

      // Clean up whitespace & formatting
      title = (title || '').replace(/[-|–].*$/, '').trim() || 'Target Position';
      company = (company || '').trim();
      description = (description || '').replace(/\s+/g, ' ').trim();

      if (!description || description.length < 40) {
        const err = new Error('Could not automatically extract job description text from this link. Please paste the job description manually.');
        err.status = 400;
        throw err;
      }

      return {
        title,
        company,
        description,
        url: rawUrl
      };
    } catch (err) {
      if (err.status) throw err;
      const customErr = new Error(`Unable to fetch job link (${err.response?.status || err.code || 'Network/Protection Block'}). Please copy and paste the job description manually.`);
      customErr.status = 400;
      throw customErr;
    }
  }
}
