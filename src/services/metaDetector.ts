import { logger } from './logger.js';

export interface AdDetectionResult {
  // Meta
  hasMetaPixel: boolean;
  pixelIds: string[];
  hasMetaTags: boolean;
  hasFacebookLink: boolean;
  hasInstagramLink: boolean;
  facebookUrl?: string;
  instagramUrl?: string;
  isMetaIntegrated: boolean;
  runningMetaAds: boolean;
  adLibraryUrl: string;

  // Google Ads
  hasGoogleAds: boolean;
  hasGtm: boolean;
  hasGoogleAnalytics: boolean;
  googleAdsId?: string;
  gtmId?: string;
  runningGoogleAds: boolean;
  googleTransparencyUrl: string;

  // Combined Intel
  runningAds: boolean;
  adPlatforms: string[];
}

/**
 * Checks an HTML string for Meta/Facebook & Google Ads tracking tags, pixels and social links
 */
export function detectAdsFromHtml(html: string, businessName: string): AdDetectionResult {
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

  // 4. Google Ads & Tag Detection
  const hasGoogleAdsTag =
    html.includes('googleads.g.doubleclick.net') ||
    html.includes('google_conversion_id') ||
    html.includes('gtag(\'config\', \'AW-') ||
    html.includes('gtag("config", "AW-') ||
    html.includes('/pagead/conversion');

  let googleAdsId: string | undefined;
  const googleAdsMatch = html.match(/gtag\(\s*['"]config['"]\s*,\s*['"](AW-\d+)['"]/i);
  if (googleAdsMatch && googleAdsMatch[1]) {
    googleAdsId = googleAdsMatch[1];
  }

  const hasGtm = html.includes('googletagmanager.com/gtm.js') || html.includes('GTM-');
  let gtmId: string | undefined;
  const gtmMatch = html.match(/(GTM-[A-Z0-9]+)/);
  if (gtmMatch && gtmMatch[1]) {
    gtmId = gtmMatch[1];
  }

  const hasGoogleAnalytics =
    html.includes('google-analytics.com/analytics.js') ||
    html.includes('gtag(\'config\', \'G-') ||
    html.includes('gtag("config", "G-') ||
    html.includes('UA-');

  const runningGoogleAds = hasGoogleAdsTag || !!googleAdsId;
  const runningMetaAds = hasMetaPixel;

  const adPlatforms: string[] = [];
  if (runningMetaAds) {
    adPlatforms.push('Facebook', 'Instagram');
  }
  if (runningGoogleAds) {
    adPlatforms.push('Google Search Ads', 'Google Display');
  }

  const adLibraryUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${encodeURIComponent(
    businessName
  )}`;

  const googleTransparencyUrl = `https://adstransparency.google.com/?region=anywhere&q=${encodeURIComponent(
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
    runningMetaAds,
    adLibraryUrl,

    hasGoogleAds: runningGoogleAds,
    hasGtm,
    hasGoogleAnalytics,
    googleAdsId,
    gtmId,
    runningGoogleAds,
    googleTransparencyUrl,

    runningAds: runningMetaAds || runningGoogleAds,
    adPlatforms,
  };
}

/**
 * Fetches website and scans for Meta & Google Ads assets with timeout safety
 */
export async function scanLeadWebsiteForMeta(websiteUrl: string, businessName: string): Promise<AdDetectionResult> {
  const fallbackAdLibrary = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${encodeURIComponent(
    businessName
  )}`;
  const fallbackGoogle = `https://adstransparency.google.com/?region=anywhere&q=${encodeURIComponent(businessName)}`;

  if (!websiteUrl) {
    return {
      hasMetaPixel: false,
      pixelIds: [],
      hasMetaTags: false,
      hasFacebookLink: false,
      hasInstagramLink: false,
      isMetaIntegrated: false,
      runningMetaAds: false,
      adLibraryUrl: fallbackAdLibrary,

      hasGoogleAds: false,
      hasGtm: false,
      hasGoogleAnalytics: false,
      runningGoogleAds: false,
      googleTransparencyUrl: fallbackGoogle,

      runningAds: false,
      adPlatforms: [],
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
        runningMetaAds: false,
        adLibraryUrl: fallbackAdLibrary,

        hasGoogleAds: false,
        hasGtm: false,
        hasGoogleAnalytics: false,
        runningGoogleAds: false,
        googleTransparencyUrl: fallbackGoogle,

        runningAds: false,
        adPlatforms: [],
      };
    }

    const html = await res.text();
    return detectAdsFromHtml(html.slice(0, 500_000), businessName);
  } catch (err: any) {
    logger.debug('metaDetector', `Failed to scan ${websiteUrl} for ad assets: ${err.message}`);
    return {
      hasMetaPixel: false,
      pixelIds: [],
      hasMetaTags: false,
      hasFacebookLink: false,
      hasInstagramLink: false,
      isMetaIntegrated: false,
      runningMetaAds: false,
      adLibraryUrl: fallbackAdLibrary,

      hasGoogleAds: false,
      hasGtm: false,
      hasGoogleAnalytics: false,
      runningGoogleAds: false,
      googleTransparencyUrl: fallbackGoogle,

      runningAds: false,
      adPlatforms: [],
    };
  }
}
