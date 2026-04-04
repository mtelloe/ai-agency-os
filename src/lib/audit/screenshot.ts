/**
 * Website screenshots via Screenshotone API
 * Returns URLs for desktop and mobile screenshots
 */

export interface ScreenshotResult {
  desktopUrl: string | null;
  mobileUrl: string | null;
}

export async function takeScreenshots(url: string): Promise<ScreenshotResult> {
  const accessKey = process.env.SCREENSHOTONE_ACCESS_KEY;

  if (!accessKey) {
    return { desktopUrl: null, mobileUrl: null };
  }

  // Screenshotone URLs are deterministic — you can build them and they render on access
  // But we use signed URLs for better caching and reliability
  const baseParams = new URLSearchParams({
    access_key: accessKey,
    url,
    format: 'webp',
    block_ads: 'true',
    block_cookie_banners: 'true',
    block_trackers: 'true',
    delay: '2', // Wait 2s for JS to render
    timeout: '15',
    cache: 'true',
    cache_ttl: '86400', // 24h cache
  });

  const desktopParams = new URLSearchParams(baseParams);
  desktopParams.set('viewport_width', '1280');
  desktopParams.set('viewport_height', '800');
  desktopParams.set('full_page', 'false');

  const mobileParams = new URLSearchParams(baseParams);
  mobileParams.set('viewport_width', '375');
  mobileParams.set('viewport_height', '812');
  mobileParams.set('device_scale_factor', '2');
  mobileParams.set('full_page', 'false');

  // Verify both URLs are accessible (make HEAD requests)
  const desktopUrl = `https://api.screenshotone.com/take?${desktopParams}`;
  const mobileUrl = `https://api.screenshotone.com/take?${mobileParams}`;

  // Just return the URLs — they'll render on first access
  // The API is synchronous, so we verify at least one works
  try {
    const res = await fetch(desktopUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { desktopUrl: null, mobileUrl: null };
  } catch {
    return { desktopUrl: null, mobileUrl: null };
  }

  return { desktopUrl, mobileUrl };
}
