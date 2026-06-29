import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ success: false, error: 'Response sheet URL is required.' }, { status: 400 });
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return NextResponse.json({ success: false, error: 'Invalid URL. Please enter a valid HTTP/HTTPS link.' }, { status: 400 });
    }

    // Fetch third-party response key content server-side to bypass client CORS blocks
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
      return NextResponse.json({ 
        success: false, 
        error: `Could not fetch answer key. Remote server responded with code ${response.status}. Please copy and paste the raw HTML source code instead.` 
      }, { status: 200 }); // Return 200 with error message so client can display it cleanly
    }

    const htmlText = await response.text();
    return NextResponse.json({ success: true, html: htmlText });
  } catch (error: any) {
    console.error('API Fetch Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch the URL due to network timeout or site restriction. Please copy and paste the raw HTML code instead.' 
    }, { status: 200 });
  }
}
