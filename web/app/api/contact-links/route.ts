import { NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';

const DEFAULT_CONTACT_LINKS = [
  {
    id: 'email',
    name: 'Gmail / Support',
    badgeText: 'M',
    badgeBg: 'bg-[#EA4335]',
    badgeTextColor: 'text-white',
    iconType: 'mail',
    handle: 'mocktesthubsupport@gmail.com',
    url: 'mailto:mocktesthubsupport@gmail.com?subject=MockTest%20Hub%20Support%20Inquiry',
    descriptionEn: 'Official support for password resets, pass activation & grievances',
    descriptionHi: 'पासवर्ड रीसेट, पास सक्रियण और शिकायतों के लिए आधिकारिक समर्थन',
    category: 'primary',
    orderIndex: 0,
    isEnabled: true
  },
  {
    id: 'telegram',
    name: 'Telegram',
    badgeText: 'TG',
    badgeBg: 'bg-[#229ED9]',
    badgeTextColor: 'text-white',
    iconType: 'send',
    handle: '@MockTestHubOfficial',
    url: 'https://t.me/MockTestHubOfficial',
    descriptionEn: 'Instant exam alerts, free PDF notes, daily quizzes & student community',
    descriptionHi: 'त्वरित परीक्षा अलर्ट, मुफ्त पीडीएफ नोट्स और दैनिक क्विज़',
    category: 'primary',
    orderIndex: 1,
    isEnabled: true
  },
  {
    id: 'youtube',
    name: 'YouTube',
    badgeText: 'YT',
    badgeBg: 'bg-[#FF0000]',
    badgeTextColor: 'text-white',
    iconType: 'youtube',
    handle: '@MockTestHub',
    url: 'https://youtube.com/@MockTestHub',
    descriptionEn: 'Exam strategy sessions, syllabus deep-dives & question walkthroughs',
    descriptionHi: 'परीक्षा रणनीति सत्र, पाठ्यक्रम विश्लेषण और हल किए गए पेपर',
    category: 'primary',
    orderIndex: 2,
    isEnabled: true
  },
  {
    id: 'instagram',
    name: 'Instagram',
    badgeText: 'IG',
    badgeBg: 'bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]',
    badgeTextColor: 'text-white',
    iconType: 'instagram',
    handle: '@mocktesthub',
    url: 'https://instagram.com/mocktesthub',
    descriptionEn: 'Daily GK snippets, motivational quotes & upcoming notification reels',
    descriptionHi: 'दैनिक सामान्य ज्ञान, प्रेरक विचार और आगामी भर्ती रील्स',
    category: 'social',
    orderIndex: 3,
    isEnabled: true
  },
  {
    id: 'x',
    name: 'X / Twitter',
    badgeText: 'X',
    badgeBg: 'bg-black text-white dark:bg-white dark:text-black',
    badgeTextColor: '',
    iconType: 'x',
    handle: '@MockTestHub',
    url: 'https://x.com/MockTestHub',
    descriptionEn: 'Breaking recruitment news, official SSC/UPSC circulars & updates',
    descriptionHi: 'ताजा भर्ती समाचार, आधिकारिक एसएससी/यूपीएससी परिपत्र और अपडेट',
    category: 'social',
    orderIndex: 4,
    isEnabled: true
  },
  {
    id: 'reddit',
    name: 'Reddit',
    badgeText: 'R',
    badgeBg: 'bg-[#FF4500]',
    badgeTextColor: 'text-white',
    iconType: 'reddit',
    handle: 'r/MockTestHub',
    url: 'https://reddit.com/r/MockTestHub',
    descriptionEn: 'Aspirant discussions, AMA sessions & competitive prep tips',
    descriptionHi: 'उम्मीदवार चर्चा, प्रश्नोत्तर सत्र और परीक्षा तैयारी युक्तियाँ',
    category: 'community',
    orderIndex: 5,
    isEnabled: true
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Community',
    badgeText: 'WA',
    badgeBg: 'bg-[#25D366]',
    badgeTextColor: 'text-white',
    iconType: 'whatsapp',
    handle: 'MockTest Hub Alerts',
    url: 'https://whatsapp.com/channel/MockTestHub',
    descriptionEn: 'Direct broadcast channel for urgent admit card & result notifications',
    descriptionHi: 'प्रवेश पत्र और परिणाम अधिसूचनाओं के लिए सीधा प्रसारण चैनल',
    category: 'community',
    orderIndex: 6,
    isEnabled: true
  }
];

export async function GET() {
  try {
    const clientModel = (prisma as any).contactLink || (prisma as any).ContactLink;
    let links: any[] = [];

    if (clientModel && typeof clientModel.findMany === 'function') {
      links = await clientModel.findMany({
        orderBy: { orderIndex: 'asc' }
      });
    } else {
      try {
        links = await prisma.$queryRawUnsafe(`SELECT * FROM "contact_links" ORDER BY "orderIndex" ASC`);
      } catch (dbErr) {
        // Table might not exist yet before first push, return default
        return NextResponse.json({ success: true, links: DEFAULT_CONTACT_LINKS });
      }
    }

    // Auto-seed defaults if database table is completely empty
    if (!links || links.length === 0) {
      try {
        for (const item of DEFAULT_CONTACT_LINKS) {
          const now = new Date();
          if (clientModel && typeof clientModel.create === 'function') {
            await clientModel.create({ data: item });
          } else {
            await prisma.$executeRawUnsafe(
              `INSERT INTO "contact_links" ("id", "name", "badgeText", "badgeBg", "badgeTextColor", "iconType", "handle", "url", "descriptionEn", "descriptionHi", "category", "orderIndex", "isEnabled", "createdAt", "updatedAt")
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
               ON CONFLICT ("id") DO NOTHING`,
              item.id,
              item.name,
              item.badgeText,
              item.badgeBg,
              item.badgeTextColor,
              item.iconType,
              item.handle,
              item.url,
              item.descriptionEn,
              item.descriptionHi,
              item.category,
              item.orderIndex,
              item.isEnabled,
              now,
              now
            );
          }
        }
        return NextResponse.json({ success: true, links: DEFAULT_CONTACT_LINKS });
      } catch (seedErr) {
        return NextResponse.json({ success: true, links: DEFAULT_CONTACT_LINKS });
      }
    }

    return NextResponse.json({ success: true, links });
  } catch (error: any) {
    console.error('Error in GET /api/contact-links:', error);
    return NextResponse.json({ success: true, links: DEFAULT_CONTACT_LINKS });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, links, link } = body;

    const clientModel = (prisma as any).contactLink || (prisma as any).ContactLink;
    const now = new Date();

    if (action === 'reset') {
      // Reset all links to default
      if (clientModel && typeof clientModel.deleteMany === 'function') {
        await clientModel.deleteMany({});
        for (const item of DEFAULT_CONTACT_LINKS) {
          await clientModel.create({ data: item });
        }
      } else {
        await prisma.$executeRawUnsafe(`DELETE FROM "contact_links"`);
        for (const item of DEFAULT_CONTACT_LINKS) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "contact_links" ("id", "name", "badgeText", "badgeBg", "badgeTextColor", "iconType", "handle", "url", "descriptionEn", "descriptionHi", "category", "orderIndex", "isEnabled", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
            item.id,
            item.name,
            item.badgeText,
            item.badgeBg,
            item.badgeTextColor,
            item.iconType,
            item.handle,
            item.url,
            item.descriptionEn,
            item.descriptionHi,
            item.category,
            item.orderIndex,
            item.isEnabled,
            now,
            now
          );
        }
      }
      return NextResponse.json({ success: true, links: DEFAULT_CONTACT_LINKS });
    }

    if (action === 'save-all' && Array.isArray(links)) {
      for (const item of links) {
        if (!item.id) continue;
        if (clientModel && typeof clientModel.upsert === 'function') {
          await clientModel.upsert({
            where: { id: item.id },
            update: {
              name: item.name,
              badgeText: item.badgeText || '',
              badgeBg: item.badgeBg || '',
              badgeTextColor: item.badgeTextColor || 'text-white',
              iconType: item.iconType || 'link',
              handle: item.handle || '',
              url: item.url || '',
              descriptionEn: item.descriptionEn || '',
              descriptionHi: item.descriptionHi || '',
              category: item.category || 'primary',
              orderIndex: Number(item.orderIndex ?? 0),
              isEnabled: item.isEnabled !== false
            },
            create: {
              id: item.id,
              name: item.name,
              badgeText: item.badgeText || '',
              badgeBg: item.badgeBg || '',
              badgeTextColor: item.badgeTextColor || 'text-white',
              iconType: item.iconType || 'link',
              handle: item.handle || '',
              url: item.url || '',
              descriptionEn: item.descriptionEn || '',
              descriptionHi: item.descriptionHi || '',
              category: item.category || 'primary',
              orderIndex: Number(item.orderIndex ?? 0),
              isEnabled: item.isEnabled !== false
            }
          });
        } else {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "contact_links" ("id", "name", "badgeText", "badgeBg", "badgeTextColor", "iconType", "handle", "url", "descriptionEn", "descriptionHi", "category", "orderIndex", "isEnabled", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
             ON CONFLICT ("id") DO UPDATE SET
               "name" = EXCLUDED."name",
               "badgeText" = EXCLUDED."badgeText",
               "badgeBg" = EXCLUDED."badgeBg",
               "badgeTextColor" = EXCLUDED."badgeTextColor",
               "iconType" = EXCLUDED."iconType",
               "handle" = EXCLUDED."handle",
               "url" = EXCLUDED."url",
               "descriptionEn" = EXCLUDED."descriptionEn",
               "descriptionHi" = EXCLUDED."descriptionHi",
               "category" = EXCLUDED."category",
               "orderIndex" = EXCLUDED."orderIndex",
               "isEnabled" = EXCLUDED."isEnabled",
               "updatedAt" = EXCLUDED."updatedAt"`,
            item.id,
            item.name,
            item.badgeText || '',
            item.badgeBg || '',
            item.badgeTextColor || 'text-white',
            item.iconType || 'link',
            item.handle || '',
            item.url || '',
            item.descriptionEn || '',
            item.descriptionHi || '',
            item.category || 'primary',
            Number(item.orderIndex ?? 0),
            item.isEnabled !== false,
            now,
            now
          );
        }
      }
      return NextResponse.json({ success: true, message: 'All contact links saved successfully.' });
    }

    if (link && link.id) {
      if (clientModel && typeof clientModel.upsert === 'function') {
        const saved = await clientModel.upsert({
          where: { id: link.id },
          update: {
            name: link.name,
            badgeText: link.badgeText || '',
            badgeBg: link.badgeBg || '',
            badgeTextColor: link.badgeTextColor || 'text-white',
            iconType: link.iconType || 'link',
            handle: link.handle || '',
            url: link.url || '',
            descriptionEn: link.descriptionEn || '',
            descriptionHi: link.descriptionHi || '',
            category: link.category || 'primary',
            orderIndex: Number(link.orderIndex ?? 0),
            isEnabled: link.isEnabled !== false
          },
          create: {
            id: link.id,
            name: link.name,
            badgeText: link.badgeText || '',
            badgeBg: link.badgeBg || '',
            badgeTextColor: link.badgeTextColor || 'text-white',
            iconType: link.iconType || 'link',
            handle: link.handle || '',
            url: link.url || '',
            descriptionEn: link.descriptionEn || '',
            descriptionHi: link.descriptionHi || '',
            category: link.category || 'primary',
            orderIndex: Number(link.orderIndex ?? 0),
            isEnabled: link.isEnabled !== false
          }
        });
        return NextResponse.json({ success: true, link: saved });
      } else {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "contact_links" ("id", "name", "badgeText", "badgeBg", "badgeTextColor", "iconType", "handle", "url", "descriptionEn", "descriptionHi", "category", "orderIndex", "isEnabled", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           ON CONFLICT ("id") DO UPDATE SET
             "name" = EXCLUDED."name",
             "badgeText" = EXCLUDED."badgeText",
             "badgeBg" = EXCLUDED."badgeBg",
             "badgeTextColor" = EXCLUDED."badgeTextColor",
             "iconType" = EXCLUDED."iconType",
             "handle" = EXCLUDED."handle",
             "url" = EXCLUDED."url",
             "descriptionEn" = EXCLUDED."descriptionEn",
             "descriptionHi" = EXCLUDED."descriptionHi",
             "category" = EXCLUDED."category",
             "orderIndex" = EXCLUDED."orderIndex",
             "isEnabled" = EXCLUDED."isEnabled",
             "updatedAt" = EXCLUDED."updatedAt"`,
          link.id,
          link.name,
          link.badgeText || '',
          link.badgeBg || '',
          link.badgeTextColor || 'text-white',
          link.iconType || 'link',
          link.handle || '',
          link.url || '',
          link.descriptionEn || '',
          link.descriptionHi || '',
          link.category || 'primary',
          Number(link.orderIndex ?? 0),
          link.isEnabled !== false,
          now,
          now
        );
        return NextResponse.json({ success: true, link });
      }
    }

    return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in POST /api/contact-links:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing ID' }, { status: 400 });
    }

    const clientModel = (prisma as any).contactLink || (prisma as any).ContactLink;
    if (clientModel && typeof clientModel.delete === 'function') {
      await clientModel.delete({ where: { id } });
    } else {
      await prisma.$executeRawUnsafe(`DELETE FROM "contact_links" WHERE "id" = $1`, id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/contact-links:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
