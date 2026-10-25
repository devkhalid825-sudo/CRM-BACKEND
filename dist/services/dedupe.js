import { parsePhoneNumberFromString } from 'libphonenumber-js';
import crypto from 'crypto';
/**
 * Normalizes phone numbers to standard international E.164 format (+XXXXXXXXXXX)
 */
export function normalizePhone(rawPhone, countryCode = 'PK') {
    if (!rawPhone)
        return null;
    const cleaned = rawPhone.trim().replace(/[^\d+]/g, '');
    if (!cleaned)
        return null;
    try {
        const phoneNumber = parsePhoneNumberFromString(cleaned, countryCode.toUpperCase());
        if (phoneNumber && phoneNumber.isValid()) {
            return phoneNumber.format('E.164');
        }
    }
    catch {
        // fallback basic regex cleanup
    }
    // Basic fallback normalization if parser fails
    if (cleaned.startsWith('+'))
        return cleaned;
    if (countryCode.toUpperCase() === 'PK' && cleaned.startsWith('03')) {
        return `+92${cleaned.slice(1)}`;
    }
    if (countryCode.toUpperCase() === 'US' && cleaned.length === 10) {
        return `+1${cleaned}`;
    }
    return cleaned.length >= 7 ? `+${cleaned}` : null;
}
/**
 * Normalizes website URLs to a clean canonical domain (e.g. "example.com")
 */
export function normalizeWebsite(rawUrl) {
    if (!rawUrl)
        return null;
    let cleaned = rawUrl.trim().toLowerCase();
    if (!cleaned)
        return null;
    try {
        if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
            cleaned = `https://${cleaned}`;
        }
        const parsed = new URL(cleaned);
        let host = parsed.hostname;
        if (host.startsWith('www.')) {
            host = host.slice(4);
        }
        return host || null;
    }
    catch {
        // Fallback string replacement
        cleaned = cleaned.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
        const slashIdx = cleaned.indexOf('/');
        if (slashIdx > 0)
            cleaned = cleaned.slice(0, slashIdx);
        return cleaned || null;
    }
}
/**
 * Generates an immutable, collision-resistant placeKey for a lead to guarantee zero duplicates
 */
export function generatePlaceKey(params) {
    // If provider gave place_id (e.g. Google Maps ChIJ...)
    if (params.providerPlaceId && params.providerPlaceId.trim()) {
        return `${params.source}_${params.providerPlaceId.trim()}`;
    }
    // If normalized phone exists
    if (params.phoneNorm) {
        return `phone_${params.phoneNorm.replace(/\+/g, '')}`;
    }
    // If canonical website exists
    if (params.websiteNorm) {
        return `web_${params.websiteNorm.replace(/[^a-z0-9]/g, '_')}`;
    }
    // Fallback: SHA256 of lowercase name + city
    const hash = crypto
        .createHash('sha256')
        .update(`${params.name.trim().toLowerCase()}_${params.city.trim().toLowerCase()}`)
        .digest('hex')
        .slice(0, 16);
    return `${params.source}_${hash}`;
}
//# sourceMappingURL=dedupe.js.map