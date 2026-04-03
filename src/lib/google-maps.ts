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
}

export async function searchGoogleMaps(
  query: string,
  maxResults: number = 5,
): Promise<GoogleMapsResult[]> {
  if (!APIFY_TOKEN) return [];

  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchStringsArray: [query],
          maxCrawledPlacesPerSearch: maxResults,
          language: 'es',
          countryCode: 'es',
        }),
        signal: AbortSignal.timeout(90000),
      }
    );

    if (!res.ok) return [];

    const items = await res.json();
    if (!Array.isArray(items)) return [];

    return items.map((item: Record<string, unknown>) => ({
      title: (item.title as string) || '',
      phone: (item.phone as string) || null,
      website: (item.website as string) || null,
      address: (item.address as string) || null,
      city: (item.city as string) || null,
      totalScore: (item.totalScore as number) || null,
      reviewsCount: (item.reviewsCount as number) || null,
      categoryName: (item.categoryName as string) || null,
    }));
  } catch {
    return [];
  }
}
