import { logger } from './logger.js';

// Common domains or file extensions that match email regex but are junk
const IGNORED_DOMAINS = new Set([
  'example.com',
  'domain.com',
  'email.com',
  'sentry.io',
  'wixpress.com',
  'wordpress.org',
  'schema.org',
  'w3.org',
  'cloudflare.com',
  'google.com',
  'googleapis.com',
]);

const IGNORED_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.svg',
  '.bmp',
  '.tiff',
  '.css',
  '.js',
  '.woff',
  '.woff2',
];

/**
 * Extracts emails from raw HTML text using mailto links and regex patterns
 */
export function extractEmailsFromHtml(html: string): string[] {
  const emails = new Set<string>();

  // 1. Mailto links
  const mailtoRegex = /href=["']mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  let mailtoMatch;
  while ((mailtoMatch = mailtoRegex.exec(html)) !== null) {
    const email = mailtoMatch[1].toLowerCase().trim();
    emails.add(email);
  }

  // 2. Text body email regex
  const textEmailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = html.match(textEmailRegex) || [];
  for (const match of matches) {
    emails.add(match.toLowerCase().trim());
  }

  // 3. Filter invalid and junk matches
  const cleaned: string[] = [];
  for (const email of emails) {
    // Check extension
    const hasIgnoredExt = IGNORED_EXTENSIONS.some((ext) => email.endsWith(ext));
    if (hasIgnoredExt) continue;

    // Check domain
    const parts = email.split('@');
    if (parts.length !== 2) continue;
    const domain = parts[1];
    if (IGNORED_DOMAINS.has(domain)) continue;

    // Basic length sanity
    if (email.length > 80 || email.length < 5) continue;

    cleaned.push(email);
  }

  return Array.from(new Set(cleaned));
}

/**
 * Scrapes a business website to extract public contact emails
 * Performs rapid non-blocking fetches on homepage and /contact with strict timeouts
 */
export async function extractEmailsFromWebsite(websiteUrl: string): Promise<string[]> {
  if (!websiteUrl) return [];

  let formattedUrl = websiteUrl.trim();
  if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
    formattedUrl = `https://${formattedUrl}`;
  }

  const foundEmails = new Set<string>();

  const fetchWithTimeout = async (url: string, timeoutMs: number = 3500): Promise<string | null> => {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(timeoutMs),
        redirect: 'follow',
      });

      if (!res.ok) return null;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
        return null;
      }

      // Read max 500KB to stay fast
      const text = await res.text();
      return text.slice(0, 500_000);
    } catch {
      return null;
    }
  };

  try {
    // 1. Fetch Homepage
    const homeHtml = await fetchWithTimeout(formattedUrl, 3500);
    if (homeHtml) {
      const homeEmails = extractEmailsFromHtml(homeHtml);
      for (const e of homeEmails) foundEmails.add(e);
    }

    // 2. If no emails found on homepage, try /contact
    if (foundEmails.size === 0) {
      const parsed = new URL(formattedUrl);
      const contactUrl = `${parsed.origin}/contact`;
      const contactHtml = await fetchWithTimeout(contactUrl, 2500);
      if (contactHtml) {
        const contactEmails = extractEmailsFromHtml(contactHtml);
        for (const e of contactEmails) foundEmails.add(e);
      }
    }
  } catch (err: any) {
    logger.debug('scraper', `Website scraping skipped for ${websiteUrl}: ${err.message}`);
  }

  return Array.from(foundEmails).slice(0, 3);
}
