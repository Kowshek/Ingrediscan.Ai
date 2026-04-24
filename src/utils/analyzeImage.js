import { supabase } from '../lib/supabase';
import { hashIngredients } from '../lib/hash';

// Reading a Blob via FileReader stays the simplest cross-browser path to
// base64. Returns ONLY the data portion (no `data:image/...;base64,` prefix).
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const comma = typeof result === 'string' ? result.indexOf(',') : -1;
      if (comma === -1) {
        reject(new Error('Unexpected FileReader output.'));
        return;
      }
      resolve(result.slice(comma + 1));
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

// Defense against cache poisoning. The DB row is treated as untrusted input —
// even if RLS is correctly locked down today, this guard means a future
// regression doesn't let attacker-controlled JSON render in a victim's UI.
function isValidAnalysis(value) {
  if (typeof value !== 'object' || value === null) return false;
  if (typeof value.score !== 'number' || !Number.isFinite(value.score)) return false;
  if (value.score < 0 || value.score > 10) return false;
  if (!Array.isArray(value.ingredients)) return false;
  for (const ing of value.ingredients) {
    if (typeof ing !== 'object' || ing === null) return false;
    if (typeof ing.name !== 'string' || ing.name.length === 0 || ing.name.length > 200) return false;
    if (ing.status !== 'harmful' && ing.status !== 'moderate') return false;
    if (typeof ing.reason !== 'string' || ing.reason.length > 500) return false;
  }
  return true;
}

// Supabase returns PGRST116 ("Results contain 0 rows") on a .single() miss.
// We want to treat THAT as expected, but still surface real DB errors.
const NOT_FOUND_CODE = 'PGRST116';

export async function analyzeIngredients(imageFile) {
  const base64 = await fileToBase64(imageFile);
  const mediaType = imageFile.type || 'image/jpeg';

  // Pre-flight cache check — hash the image bytes as fingerprint.
  let hash;
  try {
    hash = await hashIngredients(base64);
  } catch (err) {
    // SubtleCrypto failure (very rare). Don't block the user — skip cache.
    console.warn('[analyzeImage] hash failed, skipping cache:', err);
  }

  if (hash) {
    const { data, error } = await supabase
      .from('scans')
      .select('flagged, scan_count')
      .eq('ingredient_hash', hash)
      .single();

    if (error && error.code !== NOT_FOUND_CODE) {
      // Real DB error (auth, network, schema). Don't pretend it's a cache
      // miss — surface to console so dev/Sentry sees it.
      console.error('[analyzeImage] cache lookup failed:', error);
    } else if (data?.flagged) {
      const cached = data.flagged;
      // Normalize legacy cache records that used "flagged" key.
      if (Array.isArray(cached.flagged) && !Array.isArray(cached.ingredients)) {
        cached.ingredients = cached.flagged;
        delete cached.flagged;
      }
      // Trust nothing from the DB — validate before returning.
      if (isValidAnalysis(cached)) {
        // Fire-and-forget bump on scan_count.
        supabase
          .from('scans')
          .update({ scan_count: (data.scan_count ?? 0) + 1 })
          .eq('ingredient_hash', hash)
          .then(({ error: updateErr }) => {
            if (updateErr) console.error('[analyzeImage] bump failed:', updateErr);
          });
        return cached;
      }
      console.warn('[analyzeImage] cache row failed schema validation, refetching');
    }
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const response = await fetch(
    `${supabaseUrl}/functions/v1/analyze-ingredients`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ imageBase64: base64, mediaType }),
    },
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Analysis failed. Please try again.');
  }

  const parsed = await response.json();
  if (parsed.error) {
    throw new Error(parsed.error);
  }

  // Normalize: handle both old edge function responses ("flagged") and new ("ingredients").
  if (Array.isArray(parsed.flagged) && !Array.isArray(parsed.ingredients)) {
    parsed.ingredients = parsed.flagged;
    delete parsed.flagged;
  }

  if (!isValidAnalysis(parsed)) {
    throw new Error(
      'Incomplete analysis returned. Try a clearer photo of the ingredient list.',
    );
  }

  // Cache miss — persist for future lookups (fire-and-forget).
  if (hash) {
    supabase
      .from('scans')
      .insert({
        ingredient_hash: hash,
        ingredients_raw: parsed.ingredients.map((i) => i.name).join(', '),
        score: parsed.score,
        flagged: parsed,
        scan_count: 1,
      })
      .then(({ error: insertErr }) => {
        if (insertErr) console.error('[analyzeImage] cache insert failed:', insertErr);
      });
  }

  return parsed;
}
