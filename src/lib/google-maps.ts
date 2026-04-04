const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const ACTOR_ID = 'compass~crawler-google-places';

export interface GoogleMapsResult {
  title: string;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  totalScore: number | null;
  reviewsCount: number | null;
  categoryName: string | null;
  placeId: string | null;
}

/**
 * Search Google Maps for businesses.
 * @param query - Search query (e.g. "centro estetica Barcelona")
 * @param maxResults - How many results to return
 * @param excludeNames - Businesses already in the system (normalized lowercase names) to skip
 */
export async function searchGoogleMaps(
  query: string,
  maxResults: number = 5,
  excludeNames: string[] = [],
): Promise<GoogleMapsResult[]> {
  if (!APIFY_TOKEN) return [];

  try {
    // Request MORE results than needed so we can filter out duplicates
    const requestCount = maxResults + excludeNames.length + 5;

    const res = await fetch(
      `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchStringsArray: [query],
          maxCrawledPlacesPerSearch: Math.min(requestCount, 30),
          language: 'es',
          countryCode: 'es',
        }),
        signal: AbortSignal.timeout(90000),
      }
    );

    if (!res.ok) return [];

    const items = await res.json();
    if (!Array.isArray(items)) return [];

    const excludeSet = new Set(excludeNames.map(n => normalizeName(n)));

    const results: GoogleMapsResult[] = [];
    for (const item of items) {
      const title = (item.title as string) || '';
      if (!title) continue;

      // Skip if this business is already in the system
      if (excludeSet.has(normalizeName(title))) continue;

      // Skip if we already have this one in current results (same name or same phone)
      const phone = (item.phone as string) || null;
      const website = (item.website as string) || null;
      if (results.some(r =>
        normalizeName(r.title) === normalizeName(title) ||
        (phone && r.phone === phone) ||
        (website && r.website && normalizeUrl(r.website) === normalizeUrl(website))
      )) continue;

      results.push({
        title,
        phone,
        website,
        address: (item.address as string) || null,
        city: (item.city as string) || null,
        totalScore: (item.totalScore as number) || null,
        reviewsCount: (item.reviewsCount as number) || null,
        categoryName: (item.categoryName as string) || null,
        placeId: (item.placeId as string) || null,
      });

      if (results.length >= maxResults) break;
    }

    return results;
  } catch {
    return [];
  }
}

function normalizeName(name: string): string {
  return name.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace('www.', '').toLowerCase();
  } catch {
    return url.toLowerCase().replace('www.', '');
  }
}
