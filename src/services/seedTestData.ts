import { prisma } from '../db/prisma.js';
import { logger } from './logger.js';

export async function seedTestLeadsAndMeetings(currentUserId?: string) {
  // Find or use admin/current user for owner & meeting creator
  let userId = currentUserId;
  if (!userId) {
    const adminUser = await prisma.user.findFirst({
      where: { role: 'admin' },
    });
    userId = adminUser?.id;
  }
  if (!userId) {
    const anyUser = await prisma.user.findFirst();
    userId = anyUser?.id;
  }

  const testLeadsData = [
    {
      placeKey: 'test_lead_meta_web_1',
      name: 'Apex Web Studio & Digital Portals',
      phones: ['+923001234567'],
      phoneNorm: '+923001234567',
      emails: ['founders@apexwebstudio.com', 'sales@apexwebstudio.com'],
      website: 'https://apexwebstudio.com',
      websiteNorm: 'apexwebstudio.com',
      address: 'Main Boulevard, Gulberg III',
      city: 'Lahore',
      country: 'PK',
      categoryName: 'Website Development (Next.js, WordPress, Web Apps)',
      rating: 4.9,
      source: 'meta_integrated',
      status: 'meeting',
      tags: ['Meta Integrated', 'Meta Pixel Active', 'Meta Ads Active', 'Has Email', 'High Value'],
      adsInfo: {
        running: true,
        platforms: ['Facebook', 'Instagram', 'Meta Audience Network'],
        pixelDetected: true,
        adLibraryUrl: 'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=Apex+Web+Studio',
        checkedAt: new Date().toISOString(),
      },
      meeting: {
        title: 'Full-Stack Next.js 15 & CRM Portal Strategy Call',
        offsetHours: 4, // 4 hours from now
        meetLink: 'https://meet.google.com/apx-webr-str',
        notes: 'Client wants to migrate legacy WordPress site to Next.js 15 and integrate a custom client onboarding CRM. Budget: $3,500.',
        status: 'scheduled',
      },
      proposal: {
        title: 'Enterprise Web Portal & Automated CRM Architecture',
        totalAmount: 3500,
        currency: 'USD',
        items: [
          { item: 'Next.js 15 Responsive Web Application', qty: 1, rate: 1800 },
          { item: 'Custom CRM Pipeline & Lead Capture Automation', qty: 1, rate: 1200 },
          { item: 'Cloud Deployment, SSL & Performance Hardening', qty: 1, rate: 500 },
        ],
      },
    },
    {
      placeKey: 'test_lead_meta_ecom_2',
      name: 'Luxe Aura D2C Fashion & Apparel',
      phones: ['+971509876543'],
      phoneNorm: '+971509876543',
      emails: ['growth@luxeaura.ae', 'vip@luxeaura.ae'],
      website: 'https://luxeaura.ae',
      websiteNorm: 'luxeaura.ae',
      address: 'Downtown Dubai, Boulevard Plaza',
      city: 'Dubai',
      country: 'AE',
      categoryName: 'Meta Integrated E-Commerce Brands (Meta Ads & Pixel)',
      rating: 4.8,
      source: 'meta_integrated',
      status: 'meeting',
      tags: ['Meta Integrated', 'Meta Pixel Active', 'Meta Ads Active', 'Shopify Plus', 'Has Email'],
      adsInfo: {
        running: true,
        platforms: ['Instagram', 'Facebook'],
        pixelDetected: true,
        adLibraryUrl: 'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=Luxe+Aura',
        checkedAt: new Date().toISOString(),
      },
      meeting: {
        title: 'Meta Ads ROAS Scaling & E-Commerce Speed Optimization',
        offsetHours: 24, // tomorrow
        meetLink: 'https://meet.google.com/lux-aura-dcb',
        notes: 'Currently spending $4,500/mo on Meta Ads. Checkout speed optimization needed to improve purchase conversion rate from 1.2% to 3.5%.',
        status: 'scheduled',
      },
    },
    {
      placeKey: 'test_lead_meta_saas_3',
      name: 'CloudScale SaaS & Web Apps',
      phones: ['+12125550198'],
      phoneNorm: '+12125550198',
      emails: ['hello@cloudscalesystems.io'],
      website: 'https://cloudscalesystems.io',
      websiteNorm: 'cloudscalesystems.io',
      address: '450 Lexington Ave',
      city: 'New York',
      country: 'US',
      categoryName: 'Custom CRM, ERP & SaaS Web Applications',
      rating: 5.0,
      source: 'meta_integrated',
      status: 'proposal',
      tags: ['Meta Integrated', 'Meta Ads Active', 'Has Email', 'SaaS Client'],
      adsInfo: {
        running: true,
        platforms: ['Facebook', 'Instagram'],
        pixelDetected: true,
        adLibraryUrl: 'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=CloudScale+SaaS',
        checkedAt: new Date().toISOString(),
      },
      proposal: {
        title: 'B2B Analytics Dashboard & Real-time Web Portal',
        totalAmount: 4800,
        currency: 'USD',
        items: [
          { item: 'React & Tailwind Dashboard Design System', qty: 1, rate: 2200 },
          { item: 'WebSocket Live Sync & Postgres API Engine', qty: 1, rate: 1800 },
          { item: 'Multi-tenant User Authentication & RBAC', qty: 1, rate: 800 },
        ],
      },
    },
    {
      placeKey: 'test_lead_meta_clinic_4',
      name: 'PrimeCare Aesthetic & Dental Clinic',
      phones: ['+442079460912'],
      phoneNorm: '+442079460912',
      emails: ['appointments@primecarelondon.co.uk'],
      website: 'https://primecarelondon.co.uk',
      websiteNorm: 'primecarelondon.co.uk',
      address: 'Harley Street, Marylebone',
      city: 'London',
      country: 'GB',
      categoryName: 'High-Ticket Aesthetic & Dental Clinics',
      rating: 4.9,
      source: 'meta_integrated',
      status: 'meeting',
      tags: ['Meta Integrated', 'Meta Ads Active', 'Has Email'],
      adsInfo: {
        running: true,
        platforms: ['Facebook', 'Instagram'],
        pixelDetected: true,
        adLibraryUrl: 'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=PrimeCare+London',
        checkedAt: new Date().toISOString(),
      },
      meeting: {
        title: 'High-Ticket Patient Booking Funnel & WhatsApp Automation',
        offsetHours: -24, // completed yesterday
        meetLink: 'https://meet.google.com/prm-care-ldn',
        notes: 'Demonstrated automated patient triage bot. Client requested written contract for onboarding.',
        status: 'completed',
      },
    },
    {
      placeKey: 'test_lead_meta_realestate_5',
      name: 'Skyline Luxury Real Estate & Villas',
      phones: ['+966501234567'],
      phoneNorm: '+966501234567',
      emails: ['properties@skylineluxury.sa'],
      website: 'https://skylineluxury.sa',
      websiteNorm: 'skylineluxury.sa',
      address: 'King Fahd Road, Al Olaya',
      city: 'Riyadh',
      country: 'SA',
      categoryName: 'Real Estate & Property Developers',
      rating: 4.7,
      source: 'meta_integrated',
      status: 'interested',
      tags: ['Meta Integrated', 'Meta Pixel Active', 'Meta Ads Active', 'Has Email'],
      adsInfo: {
        running: true,
        platforms: ['Facebook', 'Instagram'],
        pixelDetected: true,
        adLibraryUrl: 'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=Skyline+Luxury',
        checkedAt: new Date().toISOString(),
      },
      meeting: {
        title: 'Virtual 3D Property Showcase & Lead Qualification Engine',
        offsetHours: 48, // in 2 days
        meetLink: 'https://meet.google.com/sky-line-ryd',
        notes: 'Presenting modern real estate landing page with interactive floor plans and automated WhatsApp lead booking.',
        status: 'scheduled',
      },
    },
    {
      placeKey: 'test_lead_meta_video_6',
      name: 'ViralPulse UGC & AI Video Ads Media',
      phones: ['+13055550188'],
      phoneNorm: '+13055550188',
      emails: ['creative@viralpulsemedia.com'],
      website: 'https://viralpulsemedia.com',
      websiteNorm: 'viralpulsemedia.com',
      address: 'Brickell Ave, Financial District',
      city: 'Miami',
      country: 'US',
      categoryName: 'AI Video Ads, UGC & Explainer Video Production',
      rating: 4.9,
      source: 'meta_integrated',
      status: 'contacted',
      tags: ['Meta Integrated', 'Meta Ads Active', 'Has Email', 'UGC Creatives'],
      adsInfo: {
        running: true,
        platforms: ['Instagram', 'Facebook', 'TikTok'],
        pixelDetected: true,
        adLibraryUrl: 'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=ViralPulse+Media',
        checkedAt: new Date().toISOString(),
      },
    },
    {
      placeKey: 'test_lead_webdev_nopixel_7',
      name: 'ByteCraft Custom WordPress & Webflow',
      phones: ['+14165550144'],
      phoneNorm: '+14165550144',
      emails: ['hello@bytecraftweb.ca'],
      website: 'https://bytecraftweb.ca',
      websiteNorm: 'bytecraftweb.ca',
      address: 'King St West',
      city: 'Toronto',
      country: 'CA',
      categoryName: 'Website Development (Next.js, WordPress, Web Apps)',
      rating: 4.6,
      source: 'google_places',
      status: 'new',
      tags: ['Missing Meta Pixel', 'Has Email', 'WordPress Agency'],
      adsInfo: {
        running: false,
        platforms: [],
        pixelDetected: false,
        adLibraryUrl: 'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=ByteCraft+Web',
        checkedAt: new Date().toISOString(),
      },
    },
    {
      placeKey: 'test_lead_shopify_ecom_8',
      name: 'Zenith Organic Health & Supplements',
      phones: ['+61299990155'],
      phoneNorm: '+61299990155',
      emails: ['orders@zenithsupps.com.au'],
      website: 'https://zenithsupps.com.au',
      websiteNorm: 'zenithsupps.com.au',
      address: 'George Street',
      city: 'Sydney',
      country: 'AU',
      categoryName: 'Shopify & Headless E-Commerce Development',
      rating: 4.8,
      source: 'meta_integrated',
      status: 'won',
      tags: ['Meta Integrated', 'Meta Pixel Active', 'Meta Ads Active', 'Shopify Store', 'Has Email'],
      adsInfo: {
        running: true,
        platforms: ['Facebook', 'Instagram'],
        pixelDetected: true,
        adLibraryUrl: 'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=Zenith+Supplements',
        checkedAt: new Date().toISOString(),
      },
      proposal: {
        title: 'Shopify Plus Custom Theme & Meta Conversion API (CAPI)',
        totalAmount: 2900,
        currency: 'USD',
        status: 'accepted',
        items: [
          { item: 'Shopify 2.0 Theme Speed Optimization & Redesign', qty: 1, rate: 1900 },
          { item: 'Meta Conversions API (CAPI) Server-side Tracking', qty: 1, rate: 1000 },
        ],
      },
    },
  ];

  let createdLeadsCount = 0;
  let createdMeetingsCount = 0;
  let createdProposalsCount = 0;

  for (const item of testLeadsData) {
    const { meeting, proposal, ...leadData } = item;

    const lead = await prisma.lead.upsert({
      where: { placeKey: leadData.placeKey },
      update: {
        name: leadData.name,
        phones: leadData.phones,
        phoneNorm: leadData.phoneNorm,
        emails: leadData.emails,
        website: leadData.website,
        websiteNorm: leadData.websiteNorm,
        address: leadData.address,
        city: leadData.city,
        country: leadData.country,
        categoryName: leadData.categoryName,
        rating: leadData.rating,
        status: leadData.status,
        tags: leadData.tags,
        adsInfo: leadData.adsInfo,
        ownerId: userId || null,
      },
      create: {
        placeKey: leadData.placeKey,
        name: leadData.name,
        phones: leadData.phones,
        phoneNorm: leadData.phoneNorm,
        emails: leadData.emails,
        website: leadData.website,
        websiteNorm: leadData.websiteNorm,
        address: leadData.address,
        city: leadData.city,
        country: leadData.country,
        categoryName: leadData.categoryName,
        rating: leadData.rating,
        source: leadData.source,
        status: leadData.status,
        tags: leadData.tags,
        adsInfo: leadData.adsInfo,
        ownerId: userId || null,
      },
    });

    createdLeadsCount++;

    // Create Meeting if specified
    if (meeting && userId) {
      const startTime = new Date(Date.now() + meeting.offsetHours * 3600 * 1000);
      const endTime = new Date(startTime.getTime() + 45 * 60 * 1000); // 45 min

      // Check if meeting already exists for this lead
      const existingMeeting = await prisma.meeting.findFirst({
        where: { leadId: lead.id, title: meeting.title },
      });

      if (!existingMeeting) {
        await prisma.meeting.create({
          data: {
            leadId: lead.id,
            userId,
            title: meeting.title,
            startTime,
            endTime,
            meetLink: meeting.meetLink,
            status: meeting.status,
            notes: meeting.notes,
          },
        });
        createdMeetingsCount++;
      }
    }

    // Create Proposal if specified
    if (proposal && userId) {
      const existingProposal = await prisma.proposal.findFirst({
        where: { leadId: lead.id, title: proposal.title },
      });

      if (!existingProposal) {
        await prisma.proposal.create({
          data: {
            leadId: lead.id,
            userId,
            title: proposal.title,
            currency: proposal.currency || 'USD',
            totalAmount: proposal.totalAmount,
            status: proposal.status || 'sent',
            items: proposal.items,
            notes: 'Generated test proposal for evaluation and presentation.',
          },
        });
        createdProposalsCount++;
      }
    }
  }

  logger.info('seed', `Seeded ${createdLeadsCount} test leads, ${createdMeetingsCount} meetings, ${createdProposalsCount} proposals`);

  return {
    success: true,
    leadsCount: createdLeadsCount,
    meetingsCount: createdMeetingsCount,
    proposalsCount: createdProposalsCount,
  };
}
