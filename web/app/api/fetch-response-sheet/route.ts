import { NextResponse } from 'next/server';
import https from 'https';
import http from 'http';

// Helper to manually parse protocol, host, port, and raw path preserving all slashes exactly
function parseUrlRaw(urlStr: string) {
  const match = urlStr.match(/^(https?):\/\/([^\/]+)(.*)$/);
  if (!match) {
    throw new Error('Invalid URL format');
  }
  const protocol = match[1];
  const hostAndPort = match[2];
  const rawPath = match[3] || '/';

  const [hostname, portStr] = hostAndPort.split(':');
  const port = portStr ? parseInt(portStr, 10) : (protocol === 'https' ? 443 : 80);

  return {
    protocol,
    hostname,
    port,
    rawPath
  };
}

// Fetch HTML with redirect support preserving raw URL path structure (e.g. double slashes)
function fetchHtmlFollowRedirectsRaw(
  urlStr: string,
  maxRedirects = 5
): Promise<{ status: number; html: string }> {
  return new Promise((resolve, reject) => {
    function doRequest(currentUrl: string, redirectsLeft: number) {
      let parsed;
      try {
        parsed = parseUrlRaw(currentUrl);
      } catch (err) {
        return reject(err);
      }

      const lib = parsed.protocol === 'https' ? https : http;
      const options = {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.rawPath,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'max-age=0'
        }
      };

      const req = lib.request(options, (res) => {
        const { statusCode = 200, headers } = res;

        // Follow redirects
        if (
          redirectsLeft > 0 &&
          statusCode >= 300 &&
          statusCode < 400 &&
          headers.location
        ) {
          res.resume();
          // Resolve next URL relative to current location
          let targetUrl = headers.location;
          if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            const origin = `${parsed.protocol}://${parsed.hostname}${parsed.port !== 443 && parsed.port !== 80 ? ':' + parsed.port : ''}`;
            if (targetUrl.startsWith('/')) {
              targetUrl = origin + targetUrl;
            } else {
              // Relative redirect path
              const lastSlashIndex = parsed.rawPath.lastIndexOf('/');
              const basePath = lastSlashIndex !== -1 ? parsed.rawPath.substring(0, lastSlashIndex + 1) : '/';
              targetUrl = origin + basePath + targetUrl;
            }
          }
          doRequest(targetUrl, redirectsLeft - 1);
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

    const result = await fetchHtmlFollowRedirectsRaw(url);

    if (result.status < 200 || result.status >= 400) {
      return NextResponse.json(
        {
          success: false,
          error: `Remote server responded with HTTP ${result.status}. The URL may be expired or require login. Please open the link in your browser, press Ctrl+U (or Cmd+U) to view page source, press Ctrl+A → Ctrl+C, then paste it in the "Paste HTML" box below.`,
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
