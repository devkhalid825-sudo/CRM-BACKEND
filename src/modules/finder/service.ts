import { prisma } from '../../db/prisma.js';
import { generateGeoGrid, GeoCell } from '../../services/geoGrid.js';
import { normalizePhone, normalizeWebsite, generatePlaceKey } from '../../services/dedupe.js';
import { failover } from '../../services/failover.js';
import { placesProviders, PlacesProvider } from '../../integrations/places/index.js';
import { AllProvidersExhaustedError } from '../../services/errors.js';
import { logger } from '../../services/logger.js';
import { sendNotification } from '../../services/notify.js';
import { extractEmailsFromWebsite } from '../../services/scraper.js';
import { scanLeadWebsiteForMeta } from '../../services/metaDetector.js';

export interface CreateJobInput {
  country: string;
  region?: string;
  city?: string;
  categoryId: string;
  providerId?: string;
  keyId?: string;
}

const FALLBACK_CATEGORY_KEYWORDS: Record<string, string[]> = {
  cat_clinics: ['dental clinic', 'aesthetic clinic', 'dermatology clinic', 'cosmetic surgery clinic', 'medical center'],
  cat_realestate: ['real estate agency', 'property developer', 'real estate broker', 'luxury properties'],
  cat_ecommerce_brands: ['fashion boutique', 'jewellery store', 'luxury retail store', 'cosmetics shop', 'clothing brand'],
  cat_restaurants: ['fine dining restaurant', 'luxury cafe', 'bistro', 'catering company', 'bakery'],
  cat_lawyers: ['law firm', 'corporate lawyer', 'legal consultant', 'advocate office'],
  cat_luxury_cars: ['luxury car rental', 'car rental agency', 'exotic car hire', 'auto detailing showroom'],
  cat_solar_contractors: ['solar energy company', 'solar panel installation', 'roofing contractor', 'hvac contractor'],
  cat_interior_design: ['interior design studio', 'architecture firm', 'interior decorator', 'home renovation'],
  cat_accounting: ['accounting firm', 'chartered accountant', 'tax consultant', 'audit firm'],
  cat_gyms: ['fitness gym', 'crossfit box', 'yoga studio', 'wellness spa', 'beauty salon'],
  cat_schools: ['private school', 'training academy', 'language institute', 'education center'],
  cat_logistics: ['cargo company', 'relocation services', 'freight logistics', 'tour operator'],
  cat_remote_staff: ['overseas agency', 'hiring manager', 'foreign business'],
};

// Automatic exclusion filter to prevent scraping competitors / agencies who build products themselves
export const COMPETITOR_NEGATIVE_KEYWORDS = [
  'software house',
  'software development',
  'web development',
  'web dev',
  'app development',
  'software company',
  'it solutions',
  'it consultancy',
  'digital marketing agency',
  'web design agency',
  'seo agency',
  'dev studio',
  'code lab',
  'software agency',
];

export function isCompetitorOrSelfBuilder(name: string, category = '', website = ''): boolean {
  const text = `${name} ${category} ${website}`.toLowerCase();
  return COMPETITOR_NEGATIVE_KEYWORDS.some((kw) => text.includes(kw));
}

function resolveCityCoords(cityName?: string): { lat: number; lng: number } {
  if (!cityName) return { lat: 25.2048, lng: 55.2708 };
  const lower = cityName.toLowerCase().trim();
  const cityMap: Record<string, { lat: number; lng: number }> = {
    dubai: { lat: 25.2048, lng: 55.2708 },
    'abu dhabi': { lat: 24.4539, lng: 54.3773 },
    sharjah: { lat: 25.3463, lng: 55.4209 },
    karachi: { lat: 24.8607, lng: 67.0011 },
    lahore: { lat: 31.5204, lng: 74.3587 },
    islamabad: { lat: 33.6844, lng: 73.0479 },
    riyadh: { lat: 24.7136, lng: 46.6753 },
    jeddah: { lat: 21.4858, lng: 39.1925 },
    london: { lat: 51.5074, lng: -0.1278 },
    'new york': { lat: 40.7128, lng: -74.006 },
    toronto: { lat: 43.6532, lng: -79.3832 },
    sydney: { lat: -33.8688, lng: 151.2093 },
  };
  return cityMap[lower] || { lat: 25.2048, lng: 55.2708 };
}

export class FinderService {
  /**
   * Estimates total requests and expected leads before starting
   */
  async estimateJob(input: CreateJobInput): Promise<{
    cellsCount: number;
    keywordsCount: number;
    totalRequests: number;
    estimatedLeads: number;
  }> {
    // 1. Get city coordinates
    const defaultCoords = resolveCityCoords(input.city);
    let lat = defaultCoords.lat;
    let lng = defaultCoords.lng;

    if (input.city) {
      const cityDoc = await prisma.city.findFirst({
        where: { name: { equals: input.city, mode: 'insensitive' } },
      });
      if (cityDoc) {
        lat = cityDoc.lat;
        lng = cityDoc.lng;
      }
    }

    const cells = generateGeoGrid(lat, lng, 8, 2); // 8km radius, 2km cells

    // 2. Count keywords
    const cat = await prisma.category.findUnique({ where: { id: input.categoryId } }).catch(() => null);
    const keywordsList: string[] = [];
    if (cat?.keywords && Array.isArray(cat.keywords)) {
      for (const item of cat.keywords as any[]) {
        if (Array.isArray(item.terms)) keywordsList.push(...item.terms);
      }
    }
    if (keywordsList.length === 0 && FALLBACK_CATEGORY_KEYWORDS[input.categoryId]) {
      keywordsList.push(...FALLBACK_CATEGORY_KEYWORDS[input.categoryId]);
    }
    const keywordsCount = Math.max(keywordsList.length, 1);
    const totalRequests = cells.length * keywordsCount;

    return {
      cellsCount: cells.length,
      keywordsCount,
      totalRequests,
      estimatedLeads: totalRequests * 25, // average 20-30 leads per cell query
    };
  }

  /**
   * Create a new search job with all grid checkpoint tasks
   */
  async createJob(createdBy: string, input: CreateJobInput): Promise<any> {
    const estimate = await this.estimateJob(input);

    const defaultCoords = resolveCityCoords(input.city);
    let lat = defaultCoords.lat;
    let lng = defaultCoords.lng;
    if (input.city) {
      const cityDoc = await prisma.city.findFirst({
        where: { name: { equals: input.city, mode: 'insensitive' } },
      });
      if (cityDoc) {
        lat = cityDoc.lat;
        lng = cityDoc.lng;
      }
    }

    const cells = generateGeoGrid(lat, lng, 8, 2);

    const cat = await prisma.category.findUnique({ where: { id: input.categoryId } }).catch(() => null);
    const keywordsList: string[] = [];
    if (cat?.keywords && Array.isArray(cat.keywords)) {
      for (const item of cat.keywords as any[]) {
        if (Array.isArray(item.terms)) keywordsList.push(...item.terms);
      }
    }
    if (keywordsList.length === 0 && FALLBACK_CATEGORY_KEYWORDS[input.categoryId]) {
      keywordsList.push(...FALLBACK_CATEGORY_KEYWORDS[input.categoryId]);
    }
    if (keywordsList.length === 0) keywordsList.push(cat?.name || 'business');

    const job = await prisma.searchJob.create({
      data: {
        createdBy,
        country: input.country,
        region: input.region,
        city: input.city,
        categoryId: input.categoryId,
        providerId: input.providerId || 'auto',
        keyId: input.keyId,
        status: 'queued',
        progressDone: 0,
        progressTotal: estimate.totalRequests,
        costEstimate: estimate.totalRequests * 0.017, // ~$0.017 per Maps API call
      },
    });

    // Create tasks (the checkpoints)
    const tasksData = [];
    for (const cell of cells) {
      for (const kw of keywordsList) {
        tasksData.push({
          jobId: job.id,
          keyword: kw,
          cellLat: cell.lat,
          cellLng: cell.lng,
          cellRadius: cell.radiusKm,
          status: 'pending',
        });
      }
    }

    await prisma.searchTask.createMany({ data: tasksData });

    // Trigger execution asynchronously in background
    setImmediate(() => {
      this.executeJob(job.id).catch((err) => {
        logger.error('finder', `Error in background job ${job.id}`, { error: err.message });
      });
    });

    return job;
  }

  /**
   * Executes the job processing pending tasks checkpoint by checkpoint
   */
  async executeJob(jobId: string): Promise<void> {
    const job = await prisma.searchJob.findUnique({ where: { id: jobId } });
    if (!job || job.status === 'cancelled' || job.status === 'done') return;

    await prisma.searchJob.update({
      where: { id: jobId },
      data: { status: 'running' },
    });

    logger.info('finder', `Search job started: [${jobId}] for ${job.city || job.country}`);

    const tasks = await prisma.searchTask.findMany({
      where: { jobId, status: { in: ['pending', 'failed'] } },
      orderBy: { createdAt: 'asc' },
    });

    const providerId = job.providerId === 'auto' ? undefined : (job.providerId as any);
    const cat = await prisma.category.findUnique({ where: { id: job.categoryId } });

    for (const task of tasks) {
      // Re-check job status before each task in case user pressed Pause or Cancel
      const freshJob = await prisma.searchJob.findUnique({ where: { id: jobId } });
      if (freshJob?.status === 'paused' || freshJob?.status === 'cancelled') {
        logger.info('finder', `Job ${jobId} stopped due to status: ${freshJob.status}`);
        return;
      }

      await prisma.searchTask.update({
        where: { id: task.id },
        data: { status: 'running', attempts: task.attempts + 1 },
      });

      try {
        // Run external search through failover & key rotation engine
        const results = await failover.run(
          'places',
          async (activeKey) => {
            const provider =
              placesProviders[activeKey.providerId] ||
              (activeKey.providerId === 'gemini' ? placesProviders.gemini_places : null) ||
              placesProviders.serper ||
              placesProviders.google_places;

            return await provider.search(
              {
                keyword: task.keyword,
                country: job.country,
                cell: { lat: task.cellLat, lng: task.cellLng, radiusKm: task.cellRadius },
              },
              { apiKey: activeKey.rawKey }
            );
          },
          { pinnedProviderId: providerId, pinnedKeyId: job.keyId || undefined }
        );

        let newCount = 0;
        let dupCount = 0;

        for (const item of results) {
          const phoneNorm = normalizePhone(item.phone || '', job.country);
          const websiteNorm = normalizeWebsite(item.website || '');
          const placeKey = generatePlaceKey({
            source: item.placeKey ? 'google_places' : 'places',
            providerPlaceId: item.placeKey,
            phoneNorm,
            websiteNorm,
            name: item.name,
            city: job.city || item.city || '',
          });

          // Check deduplication
          const existing = await prisma.lead.findFirst({
            where: {
              OR: [
                { placeKey },
                ...(phoneNorm ? [{ phoneNorm }] : []),
                ...(websiteNorm ? [{ websiteNorm }] : []),
              ],
            },
          });

          if (existing) {
            dupCount += 1;
            continue;
          }

          // Exclude competitors / software houses / agencies who already build products themselves
          const isAgencySearch = job.categoryId === 'cat_remote_staff';
          if (!isAgencySearch && isCompetitorOrSelfBuilder(item.name, item.category || cat?.name || '', item.website || '')) {
            logger.info('finder', `Filtering out competitor / self-builder: ${item.name}`);
            continue;
          }

          // Scrape business website for emails & Meta integration if website is provided
          let scrapedEmails: string[] = [];
          let metaInfo: any = null;
          if (item.website) {
            try {
              const [emails, metaRes] = await Promise.all([
                extractEmailsFromWebsite(item.website),
                scanLeadWebsiteForMeta(item.website, item.name),
              ]);
              scrapedEmails = emails;
              metaInfo = metaRes;
            } catch {
              scrapedEmails = [];
            }
          }

          // Build tags
          const tags: string[] = [];
          if (!websiteNorm) {
            tags.push('No Website');
            tags.push('Needs Website Built');
          } else {
            tags.push('Has Website');
          }
          if (!phoneNorm) tags.push('No Phone');
          if (scrapedEmails.length > 0) tags.push('Has Email');

          if (metaInfo?.isMetaIntegrated) tags.push('Meta Integrated');
          if (metaInfo?.hasMetaPixel) tags.push('Meta Pixel Active');
          else if (item.website) tags.push('Missing Meta Pixel');
          if (metaInfo?.runningAds) tags.push('Meta Ads Active');

          await prisma.lead.create({
            data: {
              placeKey,
              name: item.name,
              phones: item.phone ? [item.phone] : [],
              phoneNorm,
              emails: scrapedEmails,
              website: item.website,
              websiteNorm,
              address: item.address,
              country: job.country,
              city: job.city || item.city || 'Unknown',
              lat: item.lat,
              lng: item.lng,
              categoryId: job.categoryId,
              categoryName: cat?.name || undefined,
              rating: item.rating,
              source: 'google_places',
              tags,
              status: 'new',
              adsInfo: metaInfo
                ? {
                    running: metaInfo.runningAds,
                    platforms: metaInfo.runningAds ? ['Facebook', 'Instagram', 'Meta'] : [],
                    pixelDetected: metaInfo.hasMetaPixel,
                    pixelIds: metaInfo.pixelIds,
                    facebookUrl: metaInfo.facebookUrl,
                    instagramUrl: metaInfo.instagramUrl,
                    adLibraryUrl: metaInfo.adLibraryUrl,
                    checkedAt: new Date().toISOString(),
                  }
                : undefined,
            },
          });

          newCount += 1;
        }

        // Mark task done
        await prisma.searchTask.update({
          where: { id: task.id },
          data: { status: 'done', resultCount: results.length, lastError: null },
        });

        // Update job stats
        await prisma.searchJob.update({
          where: { id: jobId },
          data: {
            progressDone: { increment: 1 },
            statsFound: { increment: results.length },
            statsNew: { increment: newCount },
            statsDuplicates: { increment: dupCount },
            costActual: { increment: 0.017 },
          },
        });
      } catch (err: unknown) {
        if (err instanceof AllProvidersExhaustedError) {
          // Rule 7 & Acceptance Check: If all keys fail, pause job at checkpoint and alert admin
          await prisma.searchTask.update({
            where: { id: task.id },
            data: { status: 'failed', lastError: err.message },
          });

          await prisma.searchJob.update({
            where: { id: jobId },
            data: {
              status: 'paused',
              pausedReason: 'All provider keys are exhausted or in cooldown. Add new key to resume.',
            },
          });

          logger.warn('finder', `Job ${jobId} PAUSED at checkpoint: ${err.message}`);
          await sendNotification(job.createdBy, 'job_paused', `Job paused: ${err.message}`, `/finder/jobs`);
          return;
        }

        // Single task failure: log and continue to next task
        await prisma.searchTask.update({
          where: { id: task.id },
          data: { status: 'failed', lastError: (err as Error).message },
        });
      }
    }

    // Check if all tasks done
    const pendingCount = await prisma.searchTask.count({
      where: { jobId, status: { not: 'done' } },
    });

    if (pendingCount === 0) {
      await prisma.searchJob.update({
        where: { id: jobId },
        data: { status: 'done' },
      });
      logger.info('finder', `Job ${jobId} completed successfully!`);
      await sendNotification(job.createdBy, 'job_done', `Lead search job for ${job.city || job.country} completed!`);
    }
  }

  /**
   * Resumes all paused jobs (e.g. when an admin adds or enables a new key)
   */
  async resumePausedJobs(): Promise<number> {
    const paused = await prisma.searchJob.findMany({ where: { status: 'paused' } });
    for (const job of paused) {
      await prisma.searchJob.update({
        where: { id: job.id },
        data: { status: 'running', pausedReason: null },
      });
      setImmediate(() => this.executeJob(job.id));
    }
    return paused.length;
  }
}

export const finderService = new FinderService();
