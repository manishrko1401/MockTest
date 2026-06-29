import { NextResponse } from 'next/server';
import https from 'https';

// Retrieve HTML using Node's native HTTPS module to avoid Next.js global fetch overrides and cache header injections
function fetchHtmlViaHttps(url: string): Promise<{ status: number; html: string }> {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      const chunks: any[] = [];
      res.on('data', (chunk) => {
        chunks.push(chunk);
      });
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          status: res.statusCode || 200,
          html: buffer.toString('utf8')
        });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawUrl = body.url;
    if (!rawUrl) {
      return NextResponse.json({ success: false, error: 'Response sheet URL is required.' }, { status: 400 });
    }

    const url = rawUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return NextResponse.json({ success: false, error: 'Invalid URL. Please enter a valid HTTP/HTTPS link.' }, { status: 400 });
    }

    const result = await fetchHtmlViaHttps(url);

    if (result.status !== 200) {
      return NextResponse.json({ 
        success: false, 
        error: `Could not fetch answer key. Remote server responded with code ${result.status}. Please copy and paste the raw HTML source code instead.` 
      }, { status: 200 });
    }

    return NextResponse.json({ success: true, html: result.html });
  } catch (error: any) {
    console.error('API Fetch Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch the URL due to network timeout or site restriction. Please copy and paste the raw HTML code instead.' 
    }, { status: 200 });
  }
}
