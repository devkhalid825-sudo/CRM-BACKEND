import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { prisma } from '../src/db/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const candidatePaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
];

for (const p of candidatePaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}
dotenv.config();

async function runBackup() {
  console.log(`\n==========================================================`);
  console.log(`   GLOBAL LEAD CRM - DATABASE BACKUP UTILITY (PHASE 7)    `);
  console.log(`==========================================================\n`);

  const backupDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `crm-backup-${timestamp}.json`;
  const filePath = path.join(backupDir, filename);

  console.log(`📦 Exporting PostgreSQL tables to JSON snapshot...`);

  try {
    const [
      users,
      leads,
      tags,
      events,
      calls,
      proposals,
      meetings,
      emails,
      followupRules,
      followupTasks,
      categories,
      providers,
      configs,
    ] = await Promise.all([
      prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, active: true, createdAt: true } }),
      prisma.lead.findMany(),
      prisma.tag.findMany(),
      prisma.leadEvent.findMany({ take: 5000 }),
      prisma.callLog.findMany(),
      prisma.proposal.findMany(),
      prisma.meeting.findMany(),
      prisma.emailMessage.findMany({ take: 2000 }),
      prisma.followupRule.findMany(),
      prisma.followupTask.findMany(),
      prisma.category.findMany(),
      prisma.provider.findMany(),
      prisma.appConfig.findMany(),
    ]);

    const backupPayload = {
      meta: {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'production',
      },
      counts: {
        users: users.length,
        leads: leads.length,
        tags: tags.length,
        events: events.length,
        calls: calls.length,
        proposals: proposals.length,
        meetings: meetings.length,
        emails: emails.length,
        followupRules: followupRules.length,
        followupTasks: followupTasks.length,
        categories: categories.length,
        providers: providers.length,
        configs: configs.length,
      },
      data: {
        users,
        leads,
        tags,
        events,
        calls,
        proposals,
        meetings,
        emails,
        followupRules,
        followupTasks,
        categories,
        providers,
        configs,
      },
    };

    fs.writeFileSync(filePath, JSON.stringify(backupPayload, null, 2), 'utf8');

    const stats = fs.statSync(filePath);
    const sizeKb = (stats.size / 1024).toFixed(2);

    console.log(`✅ Backup successfully saved to: ${filePath}`);
    console.log(`📊 Snapshot size: ${sizeKb} KB`);
    console.log(`📋 Summary: ${leads.length} leads, ${proposals.length} proposals, ${emails.length} emails, ${calls.length} calls.`);
    console.log(`==========================================================\n`);
  } catch (err) {
    console.error(`❌ Backup failed:`, err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runBackup();
