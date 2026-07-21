import axios from 'axios';
import * as cheerio from 'cheerio';

export class JobScraper {
  async scrape(url) {
    try {
      const parsedUrl = new URL(url);
      const { data: html } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        timeout: 10000
      });

      const $ = cheerio.load(html);

      let title = '';
      let company = '';
      let description = '';

      // 1. Try JSON-LD structured schema (@type === "JobPosting")
      $('script[type="application/ld+json"]').each((_, element) => {
        try {
          const json = JSON.parse($(element).html() || '{}');
          const graph = Array.isArray(json) ? json : json['@graph'] || [json];
          for (const item of graph) {
            if (item['@type'] === 'JobPosting') {
              if (item.title) title = item.title;
              if (item.hiringOrganization?.name) company = item.hiringOrganization.name;
              if (item.description) description = $('<div>' + item.description + '</div>').text().trim();
            }
          }
        } catch {
          // ignore malformed JSON-LD
        }
      });

      // 2. OpenGraph Meta Tags Fallback
      if (!title) {
        title = $('meta[property="og:title"]').attr('content') || 
                $('meta[name="twitter:title"]').attr('content') || 
                $('title').text().trim();
      }

      if (!company) {
        company = $('meta[property="og:site_name"]').attr('content') || 
                  parsedUrl.hostname.replace('www.', '').split('.')[0];
      }

      if (!description) {
        description = $('meta[property="og:description"]').attr('content') || 
                      $('meta[name="description"]').attr('content') || '';
      }

      // 3. Page Body Selector Fallbacks (LinkedIn, Indeed, Lever, Greenhouse)
      if (!description || description.length < 100) {
        const bodyText = $('.show-more-less-html__markup, .jobDescriptionText, #job-description, .description, article, main').text().trim();
        if (bodyText && bodyText.length > description.length) {
          description = bodyText;
        }
      }

      // Clean up whitespace & title formatting
      title = title.replace(/[-|–].*$/, '').trim() || 'Software Engineer';
      description = description.replace(/\s+/g, ' ').trim();

      if (!description || description.length < 50) {
        throw new Error('Could not automatically extract full job description text from this link.');
      }

      return {
        title,
        company,
        description,
        url
      };
    } catch (err) {
      if (err.message.includes('extract full job description')) {
        throw err;
      }
      throw new Error(`Failed to fetch job link (${err.response?.status || err.message}). Please check URL or paste description manually.`);
    }
  }
}
