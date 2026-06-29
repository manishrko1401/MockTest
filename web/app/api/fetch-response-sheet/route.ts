import { NextResponse } from 'next/server';
import https from 'https';
import http from 'http';
import { URL } from 'url';

// Fetch HTML with automatic redirect following (up to 5 hops) and gzip/encoding support
function fetchHtmlFollowRedirects(
  urlStr: string,
  maxRedirects = 5
): Promise<{ status: number; html: string }> {
  return new Promise((resolve, reject) => {
    function doRequest(currentUrl: string, redirectsLeft: number) {
      let parsed: URL;
      try {
        parsed = new URL(currentUrl);
      } catch {
        return reject(new Error(`Invalid URL: ${currentUrl}`));
      }

      const lib = parsed.protocol === 'https:' ? https : http;
      const options = {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          Connection: 'keep-alive',
        },
      };

      const req = lib.request(options, (res) => {
        const { statusCode = 200, headers } = res;

        // Follow 3xx redirects
        if (
          redirectsLeft > 0 &&
          statusCode >= 300 &&
          statusCode < 400 &&
          headers.location
        ) {
          res.resume(); // Discard body
          const nextUrl = new URL(headers.location, currentUrl).toString();
          doRequest(nextUrl, redirectsLeft - 1);
          return;
        }

        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const html = Buffer.concat(chunks).toString('utf8');
          resolve({ status: statusCode, html });
        });
        res.on('error', reject);
      });

      req.on('error', reject);
      req.end();
    }

    doRequest(urlStr, maxRedirects);
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawUrl = body?.url;

    if (!rawUrl) {
      return NextResponse.json(
        { success: false, error: 'Response sheet URL is required.' },
        { status: 400 }
      );
    }

    const url = String(rawUrl).trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return NextResponse.json(
        { success: false, error: 'Invalid URL. Please enter a valid HTTP/HTTPS link.' },
        { status: 400 }
      );
    }

    const result = await fetchHtmlFollowRedirects(url);

    if (result.status < 200 || result.status >= 400) {
      return NextResponse.json(
        {
          success: false,
          error: `Remote server responded with HTTP ${result.status}. The URL may be expired or require login. Please open the link in your browser, press Ctrl+A, then Ctrl+C and paste in the text box.`,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true, html: result.html });
  } catch (error: any) {
    console.error('API Fetch Error:', error.message || error);
    return NextResponse.json(
      {
        success: false,
        error:
          'Network error while fetching the URL. The site may be temporarily unreachable. Try again or paste the raw page source.',
      },
      { status: 200 }
    );
  }
}
