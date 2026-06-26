import { NextResponse } from 'next/server';

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl) {
    return NextResponse.json({ error: 'DATABASE_URL is not set' });
  }

  let parsedUrl = null;
  let errorMsg = null;
  try {
    const match = dbUrl.match(/^(postgresql:\/\/)([^:]+):([^@]+)@([^:/]+)(:(\d+))?(\/(.+))$/);
    if (match) {
      const protocol = match[1];
      const username = match[2];
      const password = match[3];
      const host = match[4];
      const port = match[6] || '';
      const rest = match[7];

      const maskedPassword = password.length > 2 
        ? password[0] + '*'.repeat(password.length - 2) + password[password.length - 1]
        : '*'.repeat(password.length);

      parsedUrl = {
        protocol,
        username,
        maskedPassword,
        passwordLength: password.length,
        host,
        port,
        rest,
        fullLength: dbUrl.length,
      };
    } else {
      errorMsg = 'Could not parse connection string pattern';
    }
  } catch (e: any) {
    errorMsg = e.message;
  }

  return NextResponse.json({
    success: true,
    hasDbUrl: dbUrl.length > 0,
    dbUrlStartsWith: dbUrl.substring(0, 15),
    dbUrlEndsWith: dbUrl.substring(dbUrl.length - 15),
    parsedUrl,
    errorMsg,
  });
}
