/**
 * Extracts emails from raw HTML text using mailto links and regex patterns
 */
export declare function extractEmailsFromHtml(html: string): string[];
/**
 * Scrapes a business website to extract public contact emails
 * Performs rapid non-blocking fetches on homepage and /contact with strict timeouts
 */
export declare function extractEmailsFromWebsite(websiteUrl: string): Promise<string[]>;
//# sourceMappingURL=scraper.d.ts.map