/**
 * Google Places API — business data from Google Maps
 * Returns real data: reviews, rating, hours, phone, etc.
 */

export interface GooglePlacesResult {
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  priceLevel: number | null;
  types: string[];
  openNow: boolean | null;
  mapsUrl: string | null;
  businessStatus: string | null;
}

export async function getGooglePlacesData(businessName: string, url: string): Promise<GooglePlacesResult | null> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  try {
    // Extract domain for better search
    const domain = new URL(url).hostname.replace('www.', '');

    // Search by business name + domain
    const query = `${businessName} ${domain}`;
    const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id,name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,price_level,types,opening_hours,business_status,url&key=${apiKey}`;

    const searchRes = await fetch(searchUrl, {
      signal: AbortSignal.timeout(10000),
    });

    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    const candidates = searchData.candidates || [];

    if (candidates.length === 0) {
      // Try with just the business name
      const fallbackUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(businessName)}&inputtype=textquery&fields=place_id,name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,price_level,types,opening_hours,business_status,url&key=${apiKey}`;
      const fallbackRes = await fetch(fallbackUrl, { signal: AbortSignal.timeout(10000) });
      if (!fallbackRes.ok) return null;
      const fallbackData = await fallbackRes.json();
      if (!fallbackData.candidates?.length) return null;
      return mapCandidate(fallbackData.candidates[0]);
    }

    return mapCandidate(candidates[0]);
  } catch {
    return null;
  }
}

function mapCandidate(c: Record<string, unknown>): GooglePlacesResult {
  return {
    name: (c.name as string) || '',
    address: (c.formatted_address as string) || null,
    phone: (c.formatted_phone_number as string) || null,
    website: (c.website as string) || null,
    rating: (c.rating as number) || null,
    reviewCount: (c.user_ratings_total as number) || null,
    priceLevel: (c.price_level as number) || null,
    types: (c.types as string[]) || [],
    openNow: (c.opening_hours as { open_now?: boolean })?.open_now ?? null,
    mapsUrl: (c.url as string) || null,
    businessStatus: (c.business_status as string) || null,
  };
}
