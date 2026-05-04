import axios from 'axios';

const FDA_BASE = 'https://api.fda.gov/drug/ndc.json';

export interface FdaProduct {
  brand_name?: string;
  generic_name: string;
  labeler?: string;
  dosage_form?: string;
  route?: string;
  strength?: string;
  package_size?: string;
  raw: Record<string, unknown>;
}

function normalizeNdc(ndc: string): string[] {
  const clean = ndc.replace(/-/g, '');
  // FDA NDC can be 5-4-2, 5-3-2, 4-4-2 — try common formats
  const candidates: string[] = [clean];
  if (clean.length === 10) {
    candidates.push(`${clean.slice(0, 5)}-${clean.slice(5, 9)}-${clean.slice(9)}`);
    candidates.push(`${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8)}`);
  }
  return candidates;
}

export async function ndcLookup(ndc: string): Promise<FdaProduct | null> {
  const candidates = normalizeNdc(ndc);

  for (const candidate of candidates) {
    try {
      const { data } = await axios.get(FDA_BASE, {
        params: { search: `product_ndc:"${candidate}"`, limit: 1 },
        timeout: 5000,
      });

      const result = data?.results?.[0];
      if (!result) continue;

      const packaging = result.packaging?.[0];
      return {
        brand_name: result.brand_name,
        generic_name: result.generic_name ?? result.brand_name ?? 'Unknown',
        labeler: result.labeler_name,
        dosage_form: result.dosage_form,
        route: result.route?.[0],
        strength: result.active_ingredients
          ?.map((ai: { name: string; strength: string }) => `${ai.name} ${ai.strength}`)
          ?.join(' / '),
        package_size: packaging?.description,
        raw: result,
      };
    } catch (err) {
      // Try next candidate
      if (axios.isAxiosError(err) && err.response?.status === 404) continue;
      console.error('[ndc] FDA lookup error', err);
    }
  }

  return null;
}
