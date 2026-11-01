import test from 'node:test';
import assert from 'node:assert';
import { extractEmailsFromHtml } from './scraper.js';

test('extractEmailsFromHtml extracts mailto and body emails correctly', () => {
  const html = `
    <html>
      <body>
        <h1>Contact Us</h1>
        <p>Email us directly at <a href="mailto:info@businesslaw.com?subject=Inquiry">info@businesslaw.com</a></p>
        <p>Or support team at support@businesslaw.com</p>
        <img src="logo@2x.png" />
        <a href="mailto:test@example.com">Fake Example</a>
      </body>
    </html>
  `;

  const emails = extractEmailsFromHtml(html);
  assert.ok(emails.includes('info@businesslaw.com'));
  assert.ok(emails.includes('support@businesslaw.com'));
  // Should ignore png extension and example.com domain
  assert.ok(!emails.includes('logo@2x.png'));
  assert.ok(!emails.includes('test@example.com'));
});
