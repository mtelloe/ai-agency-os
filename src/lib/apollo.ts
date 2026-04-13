const APOLLO_API_KEY = process.env.APOLLO_API_KEY;
const APOLLO_BASE_URL = 'https://api.apollo.io/api/v1';

const DECISION_MAKER_TITLES = [
  'Owner', 'Propietario', 'CEO', 'Director General',
  'Gerente', 'Fundador', 'Director', 'Responsable',
  'Managing Director', 'Co-Founder', 'Cofundador',
];

export interface ApolloContact {
  nombre: string;
  cargo: string | null;
  email: string | null;
  movil: string | null;
  linkedin: string | null;
  organizacion: string | null;
}

export async function searchDecisionMaker(
  domain: string | null,
  companyName: string,
  location: string = 'Spain',
): Promise<ApolloContact | null> {
  if (!APOLLO_API_KEY) {
    console.error('[apollo] APOLLO_API_KEY no configurada');
    return null;
  }

  // Attempt 1: search by domain
  if (domain) {
    const result = await apolloPeopleSearch({
      q_organization_domains: [domain],
      person_titles: DECISION_MAKER_TITLES,
      person_locations: [location],
    });
    if (result) return result;
  }

  // Attempt 2: search by company name
  const result = await apolloPeopleSearch({
    q_organization_name: companyName,
    person_titles: DECISION_MAKER_TITLES,
    person_locations: [location],
  });
  return result;
}

export async function revealMobile(apolloPersonId: string): Promise<string | null> {
  if (!APOLLO_API_KEY) return null;

  try {
    const res = await fetch(`${APOLLO_BASE_URL}/people/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': APOLLO_API_KEY,
      },
      body: JSON.stringify({ id: apolloPersonId, reveal_phone_number: true }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const phones = data.person?.phone_numbers;
    if (Array.isArray(phones) && phones.length > 0) {
      const mobile = phones.find((p: { type?: string }) => p.type === 'mobile');
      return (mobile || phones[0]).sanitized_number || null;
    }
    return null;
  } catch {
    return null;
  }
}

async function apolloPeopleSearch(
  params: Record<string, unknown>,
): Promise<ApolloContact | null> {
  try {
    const res = await fetch(`${APOLLO_BASE_URL}/mixed_people/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': APOLLO_API_KEY!,
      },
      body: JSON.stringify({
        ...params,
        page: 1,
        per_page: 1,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error(`[apollo] People search failed: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const people = data.people;
    if (!Array.isArray(people) || people.length === 0) return null;

    const person = people[0];
    return {
      nombre: [person.first_name, person.last_name].filter(Boolean).join(' '),
      cargo: person.title || null,
      email: person.email || null,
      movil: null,
      linkedin: person.linkedin_url || null,
      organizacion: person.organization?.name || null,
    };
  } catch (error) {
    console.error('[apollo] People search error:', error);
    return null;
  }
}

export function isApolloConfigured(): boolean {
  return Boolean(APOLLO_API_KEY);
}
