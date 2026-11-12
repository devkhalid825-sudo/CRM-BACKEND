import { logger } from './logger.js';

export interface MetaDetectionResult {
  hasMetaPixel: boolean;
  pixelIds: string[];
  hasMetaTags: boolean;
  hasFacebookLink: boolean;
  hasInstagramLink: boolean;
  facebookUrl?: string;
  instagramUrl?: string;
  isMetaIntegrated: boolean;
  runningAds: boolean;
  adLibraryUrl: string;
}

/**
 * Checks an HTML string for Meta/Facebook tracking pixels, social links, and OpenGraph tags
 */
export function detectMetaFromHtml(html: string, businessName: string): MetaDetectionResult {
  const pixelIds = new Set<string>();

  // 1. Meta Pixel Detection patterns
  const hasFbqInit = html.includes("fbq('init'") || html.includes('fbq("init"');
  const hasFbEvents = html.includes('connect.facebook.net') || html.includes('fbevents.js');
  const hasFbTr = html.includes('facebook.com/tr') || html.includes('facebook.com/tr?id=');
  const hasFbp = html.includes('_fbp') || html.includes('facebook_pixel_id') || html.includes('facebook-jssdk');

  // Extract pixel IDs
  const pixelIdRegexes = [
    /fbq\(\s*['"]init['"]\s*,\s*['"](\d{10,20})['"]/gi,
    /facebook\.com\/tr\?id=(\d{10,20})/gi,
    /["']facebook_pixel_id["']\s*:\s*["'](\d{10,20})["']/gi,
  ];

  for (const regex of pixelIdRegexes) {
    let match;
    while ((match = regex.exec(html)) !== null) {
      if (match[1]) pixelIds.add(match[1]);
    }
  }

  const hasMetaPixel = hasFbqInit || hasFbEvents || hasFbTr || hasFbp || pixelIds.size > 0;

  // 2. Meta OpenGraph tags
  const hasMetaTags =
    html.includes('property="og:site_name"') ||
    html.includes('property="fb:app_id"') ||
    html.includes('property="fb:pages"') ||
    html.includes('name="facebook-domain-verification"');

  // 3. Facebook and Instagram page links
  let facebookUrl: string | undefined;
  let instagramUrl: string | undefined;

  const fbLinkMatch = html.match(/href=["'](https?:\/\/(?:www\.)?facebook\.com\/(?!sharer|share|tr)[a-zA-Z0-9._-]+)\/?["']/i);
  if (fbLinkMatch && fbLinkMatch[1]) {
    facebookUrl = fbLinkMatch[1];
  }

  const igLinkMatch = html.match(/href=["'](https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9._-]+)\/?["']/i);
  if (igLinkMatch && igLinkMatch[1]) {
    instagramUrl = igLinkMatch[1];
  }

  const hasFacebookLink = !!facebookUrl;
  const hasInstagramLink = !!instagramUrl;

  const isMetaIntegrated = hasMetaPixel || hasMetaTags || hasFacebookLink || hasInstagramLink;

  // Meta Ad Library URL for quick 1-click verification
  const adLibraryUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${encodeURIComponent(
    businessName
  )}`;

  return {
    hasMetaPixel,
    pixelIds: Array.from(pixelIds),
    hasMetaTags,
    hasFacebookLink,
    hasInstagramLink,
    facebookUrl,
    instagramUrl,
    isMetaIntegrated,
    runningAds: hasMetaPixel, // Pixel installed is the primary indicator of active Meta advertising
    adLibraryUrl,
  };
}

/**
 * Fetches website and scans for Meta assets with timeout safety
 */
export async function scanLeadWebsiteForMeta(websiteUrl: string, businessName: string): Promise<MetaDetectionResult> {
  const fallbackAdLibrary = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${encodeURIComponent(
    businessName
  )}`;

  if (!websiteUrl) {
    return {
      hasMetaPixel: false,
      pixelIds: [],
      hasMetaTags: false,
      hasFacebookLink: false,
      hasInstagramLink: false,
      isMetaIntegrated: false,
      runningAds: false,
      adLibraryUrl: fallbackAdLibrary,
    };
  }

  let formattedUrl = websiteUrl.trim();
  if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
    formattedUrl = `https://${formattedUrl}`;
  }

  try {
    const res = await fetch(formattedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(4000),
      redirect: 'follow',
    });

    if (!res.ok) {
      return {
        hasMetaPixel: false,
        pixelIds: [],
        hasMetaTags: false,
        hasFacebookLink: false,
        hasInstagramLink: false,
        isMetaIntegrated: false,
        runningAds: false,
        adLibraryUrl: fallbackAdLibrary,
      };
    }

    const html = await res.text();
    return detectMetaFromHtml(html.slice(0, 500_000), businessName);
  } catch (err: any) {
    logger.debug('metaDetector', `Failed to scan ${websiteUrl} for Meta assets: ${err.message}`);
    return {
      hasMetaPixel: false,
      pixelIds: [],
      hasMetaTags: false,
      hasFacebookLink: false,
      hasInstagramLink: false,
      isMetaIntegrated: false,
      runningAds: false,
      adLibraryUrl: fallbackAdLibrary,
    };
  }
}
