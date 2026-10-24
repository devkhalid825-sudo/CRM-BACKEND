import ExcelJS from 'exceljs';
import { prisma } from '../../db/prisma.js';

export interface LeadFilters {
  country?: string;
  city?: string;
  categoryId?: string;
  status?: string;
  ownerId?: string;
  tag?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class LeadsService {
  async getLeads(filters: LeadFilters, userRole?: string, userId?: string) {
    const page = Math.max(filters.page || 1, 1);
    const limit = Math.min(filters.limit || 50, 200);
    const skip = (page - 1) * limit;

    const where: any = {
      archivedAt: null,
    };

    // Role-based scoping (Rule 5 & Acceptance check: Sales see only own assigned leads)
    if (userRole === 'sales' && userId) {
      where.ownerId = userId;
    } else if (filters.ownerId) {
      where.ownerId = filters.ownerId;
    }

    if (filters.country) where.country = filters.country;
    if (filters.city) where.city = { equals: filters.city, mode: 'insensitive' };
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { address: { contains: filters.search, mode: 'insensitive' } },
        { website: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.lead.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getLeadById(id: string) {
    return prisma.lead.findUnique({ where: { id } });
  }

  async updateLead(id: string, data: any) {
    return prisma.lead.update({
      where: { id },
      data,
    });
  }

  /**
   * Generates a fully-formatted Excel workbook (.xlsx)
   */
  async generateExcelWorkbook(filters: LeadFilters, userRole?: string, userId?: string): Promise<ExcelJS.Buffer> {
    const { items } = await this.getLeads({ ...filters, limit: 5000 }, userRole, userId);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Global Lead CRM';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Business Leads', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    sheet.columns = [
      { header: 'Business Name', key: 'name', width: 28 },
      { header: 'Phone Number', key: 'phone', width: 18 },
      { header: 'Email Address', key: 'email', width: 25 },
      { header: 'Website', key: 'website', width: 25 },
      { header: 'Address', key: 'address', width: 35 },
      { header: 'City', key: 'city', width: 15 },
      { header: 'Country', key: 'country', width: 12 },
      { header: 'Rating', key: 'rating', width: 10 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Tags', key: 'tags', width: 22 },
      { header: 'Lead Source', key: 'source', width: 16 },
      { header: 'Added Date', key: 'createdAt', width: 18 },
    ];

    // Format Header Row
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF16A34A' }, // Emerald green
    };

    for (const lead of items) {
      const phones = Array.isArray(lead.phones) ? (lead.phones as string[]).join(', ') : lead.phoneNorm || '';
      const emails = Array.isArray(lead.emails) ? (lead.emails as string[]).join(', ') : '';
      const tags = Array.isArray(lead.tags) ? (lead.tags as string[]).join(', ') : '';

      sheet.addRow({
        name: lead.name,
        phone: phones,
        email: emails,
        website: lead.website || '',
        address: lead.address || '',
        city: lead.city,
        country: lead.country,
        rating: lead.rating || 'N/A',
        status: lead.status.toUpperCase(),
        tags,
        source: lead.source,
        createdAt: new Date(lead.createdAt).toLocaleDateString(),
      });
    }

    return await workbook.xlsx.writeBuffer();
  }
}

export const leadsService = new LeadsService();
