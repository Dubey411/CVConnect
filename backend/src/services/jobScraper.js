import axios from 'axios';
import { load } from 'cheerio';

function formatHtmlToStructuredText(rawHtml) {
  if (!rawHtml) return '';

  const $ = load(`<div>${rawHtml}</div>`);

  // Format headers and block elements with proper line breaks
  $('p, h1, h2, h3, h4, h5, h6, div, article, section').each((_, el) => {
    $(el).prepend('\n\n');
  });

  $('br').replaceWith('\n');

  $('li').each((_, el) => {
    $(el).prepend('\n• ');
  });

  let text = $.text();

  // Clean lines
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  // Group lines into readable structured text with section headers & bullet spacing
  const cleanLines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^(About|Responsibilities|Requirements|Qualifications|Perks|Role|Skills|Eligibility|What You Will Do|Who You Are|Basic Qualifications|Preferred Qualifications):?/i.test(line)) {
      cleanLines.push('');
      cleanLines.push(line.endsWith(':') ? line : `${line}:`);
    } else if (line.startsWith('•')) {
      cleanLines.push(`  ${line}`);
    } else {
      cleanLines.push(line);
    }
  }

  return cleanLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

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

      // Special Handler: Unstop (unstop.com) API Extraction
      if (parsedUrl.hostname.includes('unstop.com')) {
        const idMatch = rawUrl.match(/[-_](\d+)(?:\?|$|\/)/);
        if (idMatch && idMatch[1]) {
          try {
            const apiRes = await axios.get(`https://unstop.com/api/public/competition/${idMatch[1]}`, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json, text/plain, */*'
              },
              timeout: 10000
            });
            const comp = apiRes.data?.data?.competition;
            if (comp) {
              if (comp.title) title = comp.title;
              if (comp.organisation?.name || comp.company_name) {
                company = comp.organisation?.name || comp.company_name;
              }
              const rawDetails = comp.details || comp.about || comp.description;
              if (rawDetails) {
                description = formatHtmlToStructuredText(rawDetails);
              }
            }
          } catch {
            // Ignore Unstop API error and fallback to HTML scraping
          }
        }
      }

      // 0. Try Next.js SSR State (__NEXT_DATA__) used by Unstop and modern job boards
      if (!description) {
        const nextData = $('#__NEXT_DATA__').html();
        if (nextData) {
          try {
            const json = JSON.parse(nextData);
            const opp = json?.props?.pageProps?.opportunity || 
                        json?.props?.pageProps?.job || 
                        json?.props?.pageProps?.details || 
                        json?.props?.pageProps?.jobDetail;

            if (opp) {
              if (!title && opp.title) title = opp.title;
              if (!company && (opp.organisation?.name || opp.company_name || opp.company?.name || opp.employer_name)) {
                company = opp.organisation?.name || opp.company_name || opp.company?.name || opp.employer_name;
              }
              const rawDesc = opp.details || opp.description || opp.about || opp.about_job || opp.job_description;
              if (rawDesc) {
                description = formatHtmlToStructuredText(rawDesc);
              }
            }
          } catch {
            // Ignore malformed Next.js state
          }
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
                if (item.description && !description) description = formatHtmlToStructuredText(item.description);
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
        const rawMeta = $('meta[property="og:description"]').attr('content') ||
                        $('meta[name="description"]').attr('content') ||
                        $('meta[name="twitter:description"]').attr('content') || '';
        description = formatHtmlToStructuredText(rawMeta);
      }

      // 3. Page Body Selector Fallbacks (Unstop, Internshala, LinkedIn, Indeed, Glassdoor)
      if (!description || description.length < 100) {
        const bodyElem = $(
          '.show-more-less-html__markup, .jobDescriptionText, #job-description, .description, ' +
          '.job_details, .opportunity-details, .about-job, .details_container, .opportunity_container, ' +
          '.internship_details, .job-details, article, main'
        );
        if (bodyElem.length > 0) {
          const bodyText = formatHtmlToStructuredText(bodyElem.html() || bodyElem.text());
          if (bodyText && bodyText.length > description.length) {
            description = bodyText;
          }
        }
      }

      // Clean up whitespace & formatting
      title = (title || '').replace(/[-|–].*$/, '').trim() || 'Target Position';
      company = (company || '').trim();

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

      // Extract title hint from URL slug (e.g. 3627072-react-native-intern -> React Native Intern)
      let guessedTitle = '';
      try {
        const slugMatch = parsedUrl.pathname.match(/\/jobs\/(?:\d+-)?([a-z0-9-]+)/i);
        if (slugMatch && slugMatch[1]) {
          guessedTitle = slugMatch[1]
            .replace(/-/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());
        }
      } catch {
        // ignore slug parse error
      }

      if (err.response?.status === 403 || err.response?.status === 401 || parsedUrl.hostname.includes('wellfound.com')) {
        const customErr = new Error(`${parsedUrl.hostname.replace(/^www\./, '')} is protected by Cloudflare anti-bot security. Please copy and paste the job description text below.`);
        customErr.status = 400;
        customErr.code = 'SITE_PROTECTED';
        customErr.guessedTitle = guessedTitle;
        throw customErr;
      }

      const customErr = new Error(`Unable to fetch job link (${err.response?.status || err.code || 'Network/Protection Block'}). Please copy and paste the job description text below.`);
      customErr.status = 400;
      customErr.guessedTitle = guessedTitle;
      throw customErr;
    }
  }
}
