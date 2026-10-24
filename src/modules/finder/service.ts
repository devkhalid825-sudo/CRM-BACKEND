import { prisma } from '../../db/prisma.js';
import { generateGeoGrid, GeoCell } from '../../services/geoGrid.js';
import { normalizePhone, normalizeWebsite, generatePlaceKey } from '../../services/dedupe.js';
import { failover } from '../../services/failover.js';
import { placesProviders, PlacesProvider } from '../../integrations/places/index.js';
import { AllProvidersExhaustedError } from '../../services/errors.js';
import { logger } from '../../services/logger.js';
import { sendNotification } from '../../services/notify.js';

export interface CreateJobInput {
  country: string;
  region?: string;
  city?: string;
  categoryId: string;
  providerId?: string;
  keyId?: string;
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
    let lat = 31.5204;
    let lng = 74.3587;

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
    const cat = await prisma.category.findUnique({ where: { id: input.categoryId } });
    const keywordsList: string[] = [];
    if (cat?.keywords && Array.isArray(cat.keywords)) {
      for (const item of cat.keywords as any[]) {
        if (Array.isArray(item.terms)) keywordsList.push(...item.terms);
      }
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

    let lat = 31.5204;
    let lng = 74.3587;
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

    const cat = await prisma.category.findUnique({ where: { id: input.categoryId } });
    const keywordsList: string[] = [];
    if (cat?.keywords && Array.isArray(cat.keywords)) {
      for (const item of cat.keywords as any[]) {
        if (Array.isArray(item.terms)) keywordsList.push(...item.terms);
      }
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
            const provider = placesProviders[activeKey.providerId] || placesProviders.google_places;
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

          // Build tags
          const tags: string[] = [];
          if (!websiteNorm) tags.push('No Website');
          if (!phoneNorm) tags.push('No Phone');

          await prisma.lead.create({
            data: {
              placeKey,
              name: item.name,
              phones: item.phone ? [item.phone] : [],
              phoneNorm,
              emails: [],
              website: item.website,
              websiteNorm,
              address: item.address,
              country: job.country,
              city: job.city || item.city || 'Unknown',
              lat: item.lat,
              lng: item.lng,
              categoryId: job.categoryId,
              rating: item.rating,
              source: 'google_places',
              tags,
              status: 'new',
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
