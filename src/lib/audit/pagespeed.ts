/**
 * Google PageSpeed Insights API — free, no API key required
 * Returns real Lighthouse performance + SEO + accessibility scores
 */

export interface PageSpeedResult {
  performance: number;    // 0-100
  seo: number;            // 0-100
  accessibility: number;  // 0-100
  bestPractices: number;  // 0-100
  // Core Web Vitals
  lcp: string;            // Largest Contentful Paint (e.g. "2.5 s")
  fid: string;            // First Input Delay (e.g. "100 ms")
  cls: string;            // Cumulative Layout Shift (e.g. "0.1")
  fcp: string;            // First Contentful Paint
  ttfb: string;           // Time to First Byte
  // Summary
  isResponsive: boolean;
  usesHttps: boolean;
  hasMetaDescription: boolean;
  hasViewport: boolean;
  strategy: 'mobile' | 'desktop';
}

export async function getPageSpeed(url: string, strategy: 'mobile' | 'desktop' = 'mobile'): Promise<PageSpeedResult | null> {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    const params = new URLSearchParams({
      url,
      strategy,
      category: 'performance',
      // Multiple categories in one call
    });
    if (apiKey) params.set('key', apiKey);

    // We need to make separate calls for each category or use one with multiple
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}&category=performance&category=seo&category=accessibility&category=best-practices`;

    const res = await fetch(apiUrl, {
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const cats = data.lighthouseResult?.categories || {};
    const audits = data.lighthouseResult?.audits || {};

    return {
      performance: Math.round((cats.performance?.score || 0) * 100),
      seo: Math.round((cats.seo?.score || 0) * 100),
      accessibility: Math.round((cats.accessibility?.score || 0) * 100),
      bestPractices: Math.round((cats['best-practices']?.score || 0) * 100),
      lcp: audits['largest-contentful-paint']?.displayValue || 'N/A',
      fid: audits['max-potential-fid']?.displayValue || audits['total-blocking-time']?.displayValue || 'N/A',
      cls: audits['cumulative-layout-shift']?.displayValue || 'N/A',
      fcp: audits['first-contentful-paint']?.displayValue || 'N/A',
      ttfb: audits['server-response-time']?.displayValue || 'N/A',
      isResponsive: audits['viewport']?.score === 1,
      usesHttps: audits['is-on-https']?.score === 1,
      hasMetaDescription: audits['meta-description']?.score === 1,
      hasViewport: audits['viewport']?.score === 1,
      strategy,
    };
  } catch {
    return null;
  }
}
