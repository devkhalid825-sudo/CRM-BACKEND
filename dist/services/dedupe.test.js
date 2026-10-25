import { test, describe } from 'node:test';
import assert from 'node:assert';
import { normalizePhone, normalizeWebsite, generatePlaceKey } from './dedupe.js';
describe('Deduplication & Normalization Service', () => {
    test('normalizes Pakistan and US phone numbers to E.164', () => {
        const pkPhone = normalizePhone('0300 1234567', 'PK');
        assert.strictEqual(pkPhone, '+923001234567');
        const usPhone = normalizePhone('(415) 555-2671', 'US');
        assert.strictEqual(usPhone, '+14155552671');
    });
    test('normalizes website URLs to canonical hostname', () => {
        assert.strictEqual(normalizeWebsite('https://www.example.com/contact-us/?ref=google'), 'example.com');
        assert.strictEqual(normalizeWebsite('http://subdomain.test.org/path/'), 'subdomain.test.org');
        assert.strictEqual(normalizeWebsite('www.leadgeneration.pk'), 'leadgeneration.pk');
    });
    test('generates consistent placeKey preventing duplicates', () => {
        const key1 = generatePlaceKey({
            source: 'google_places',
            providerPlaceId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
            name: 'Sample Business',
            city: 'Lahore',
        });
        assert.strictEqual(key1, 'google_places_ChIJN1t_tDeuEmsRUsoyG83frY4');
        const key2 = generatePlaceKey({
            source: 'overpass',
            phoneNorm: '+923001234567',
            name: 'Sample Cafe',
            city: 'Karachi',
        });
        assert.strictEqual(key2, 'phone_923001234567');
    });
});
//# sourceMappingURL=dedupe.test.js.map