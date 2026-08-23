import { NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';
import { randomUUID } from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, subject, message, source } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and message are required fields.' },
        { status: 400 }
      );
    }

    const forwardedFor = req.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : null;
    const inquiryId = randomUUID();
    const now = new Date();

    const clientModel = (prisma as any).contactInquiry || (prisma as any).ContactInquiry;
    let inquiry: any;

    if (clientModel && typeof clientModel.create === 'function') {
      inquiry = await clientModel.create({
        data: {
          id: inquiryId,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone ? phone.trim() : null,
          subject: subject || 'general',
          message: message.trim(),
          source: source || 'web',
          ipAddress: ipAddress || null,
          status: 'PENDING'
        }
      });
    } else {
      // Direct raw query execution ensuring 100% reliability regardless of dev-server client cache
      await prisma.$executeRawUnsafe(
        `INSERT INTO "contact_inquiries" ("id", "name", "email", "phone", "subject", "message", "status", "source", "ipAddress", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        inquiryId,
        name.trim(),
        email.trim().toLowerCase(),
        phone ? phone.trim() : null,
        subject || 'general',
        message.trim(),
        'PENDING',
        source || 'web',
        ipAddress || null,
        now,
        now
      );

      inquiry = {
        id: inquiryId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : null,
        subject: subject || 'general',
        message: message.trim(),
        status: 'PENDING',
        source: source || 'web',
        ipAddress: ipAddress || null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };
    }

    return NextResponse.json({ success: true, inquiry });
  } catch (error: any) {
    console.error('Error in POST /api/inquiries:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const subject = searchParams.get('subject');

    const clientModel = (prisma as any).contactInquiry || (prisma as any).ContactInquiry;
    let inquiries: any[] = [];

    if (clientModel && typeof clientModel.findMany === 'function') {
      const where: any = {};
      if (status && status !== 'ALL') where.status = status;
      if (subject && subject !== 'ALL') where.subject = subject;

      inquiries = await clientModel.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });
    } else {
      let query = `SELECT * FROM "contact_inquiries" WHERE 1=1`;
      const params: any[] = [];

      if (status && status !== 'ALL') {
        params.push(status);
        query += ` AND "status" = $${params.length}`;
      }
      if (subject && subject !== 'ALL') {
        params.push(subject);
        query += ` AND "subject" = $${params.length}`;
      }
      query += ` ORDER BY "createdAt" DESC`;

      inquiries = await prisma.$queryRawUnsafe(query, ...params);
    }

    return NextResponse.json({ success: true, inquiries });
  } catch (error: any) {
    console.error('Error in GET /api/inquiries:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status, adminNotes } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing inquiry ID' }, { status: 400 });
    }

    const clientModel = (prisma as any).contactInquiry || (prisma as any).ContactInquiry;
    let updated: any;

    if (clientModel && typeof clientModel.update === 'function') {
      const updateData: any = {};
      if (status) updateData.status = status;
      if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

      updated = await clientModel.update({
        where: { id },
        data: updateData
      });
    } else {
      const now = new Date();
      if (status && adminNotes !== undefined) {
        await prisma.$executeRawUnsafe(
          `UPDATE "contact_inquiries" SET "status" = $1, "adminNotes" = $2, "updatedAt" = $3 WHERE "id" = $4`,
          status,
          adminNotes,
          now,
          id
        );
      } else if (status) {
        await prisma.$executeRawUnsafe(
          `UPDATE "contact_inquiries" SET "status" = $1, "updatedAt" = $2 WHERE "id" = $3`,
          status,
          now,
          id
        );
      } else if (adminNotes !== undefined) {
        await prisma.$executeRawUnsafe(
          `UPDATE "contact_inquiries" SET "adminNotes" = $1, "updatedAt" = $2 WHERE "id" = $3`,
          adminNotes,
          now,
          id
        );
      }
      updated = { id, status, adminNotes };
    }

    return NextResponse.json({ success: true, inquiry: updated });
  } catch (error: any) {
    console.error('Error in PATCH /api/inquiries:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing inquiry ID' }, { status: 400 });
    }

    const clientModel = (prisma as any).contactInquiry || (prisma as any).ContactInquiry;
    if (clientModel && typeof clientModel.delete === 'function') {
      await clientModel.delete({ where: { id } });
    } else {
      await prisma.$executeRawUnsafe(`DELETE FROM "contact_inquiries" WHERE "id" = $1`, id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/inquiries:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
