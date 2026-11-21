/**
 * Extracts emails from raw HTML text using mailto links and regex patterns
 */
export declare function extractEmailsFromHtml(html: string): string[];
/**
 * Extracts direct WhatsApp numbers from raw HTML text
 * Catches wa.me, api.whatsapp.com, web.whatsapp.com, and whatsapp:// links
 */
export declare function extractWhatsAppFromHtml(html: string): string[];
export interface ExtractedContacts {
    emails: string[];
    whatsAppNumbers: string[];
    hasWhatsApp: boolean;
}
/**
 * Scrapes a business website to extract verified contact emails AND direct WhatsApp numbers
 */
export declare function extractContactsFromWebsite(websiteUrl: string): Promise<ExtractedContacts>;
/**
 * Scrapes a business website to extract public contact emails
 * Performs rapid non-blocking fetches on homepage and /contact with strict timeouts
 */
export declare function extractEmailsFromWebsite(websiteUrl: string): Promise<string[]>;
//# sourceMappingURL=scraper.d.ts.map