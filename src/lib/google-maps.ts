const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

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
  googleMapsUrl: string | null;
}

/**
 * Search Google Maps for businesses using the Google Places API (New).
 * @param query - Search query (e.g. "centro estetica Barcelona")
 * @param maxResults - How many results to return
 * @param excludeNames - Businesses already in the system to skip
 */
export async function searchGoogleMaps(
  query: string,
  maxResults: number = 5,
  excludeNames: string[] = [],
): Promise<GoogleMapsResult[]> {
  if (!GOOGLE_API_KEY) {
    console.error('[google-maps] GOOGLE_API_KEY not set');
    return [];
  }

  try {
    const res = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.nationalPhoneNumber,places.websiteUri,places.formattedAddress,places.rating,places.userRatingCount,places.primaryTypeDisplayName',
        },
        body: JSON.stringify({
          textQuery: query,
          languageCode: 'es',
          regionCode: 'ES',
          pageSize: Math.min(maxResults + excludeNames.length + 5, 20),
        }),
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('[google-maps] Places API error:', res.status, err);
      return [];
    }

    const data = await res.json();
    const places: unknown[] = data.places || [];

    const excludeSet = new Set(excludeNames.map(n => normalizeName(n)));
    const results: GoogleMapsResult[] = [];

    for (const place of places) {
      const p = place as Record<string, unknown>;
      const displayName = p.displayName as { text?: string } | undefined;
      const title = displayName?.text || '';
      if (!title) continue;

      if (excludeSet.has(normalizeName(title))) continue;

      const phone = (p.nationalPhoneNumber as string) || null;
      const website = (p.websiteUri as string) || null;
      const placeId = (p.id as string) || null;

      if (results.some(r =>
        normalizeName(r.title) === normalizeName(title) ||
        (phone && r.phone === phone) ||
        (website && r.website && normalizeUrl(r.website) === normalizeUrl(website))
      )) continue;

      const primaryType = p.primaryTypeDisplayName as { text?: string } | undefined;

      results.push({
        title,
        phone,
        website,
        address: (p.formattedAddress as string) || null,
        city: extractCity(p.formattedAddress as string | undefined),
        totalScore: (p.rating as number) || null,
        reviewsCount: (p.userRatingCount as number) || null,
        categoryName: primaryType?.text || null,
        placeId,
        googleMapsUrl: placeId ? `https://www.google.com/maps/place/?q=place_id:${placeId}` : null,
      });

      if (results.length >= maxResults) break;
    }

    return results;
  } catch (err) {
    console.error('[google-maps] Unexpected error:', err);
    return [];
  }
}

function extractCity(address: string | undefined): string | null {
  if (!address) return null;
  // Spanish addresses: "Calle X, 12, 28001 Madrid, Spain" — city is last before ", Spain"
  const parts = address.replace(/, España$/, '').replace(/, Spain$/, '').split(',');
  const last = parts[parts.length - 1]?.trim();
  // Strip postal code prefix if present: "28001 Madrid" → "Madrid"
  return last?.replace(/^\d{5}\s+/, '') || null;
}

function normalizeName(name: string): string {
  return name.toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
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
