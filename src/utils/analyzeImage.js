import { supabase } from '../lib/supabase';
import { hashIngredients } from '../lib/hash';

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

export async function analyzeIngredients(imageFile) {
  const base64 = await fileToBase64(imageFile);
  const mediaType = imageFile.type || "image/jpeg";

  // Pre-flight cache check — hash the image bytes as fingerprint
  let hash;
  try {
    hash = await hashIngredients(base64);
    const { data } = await supabase
      .from('scans')
      .select('*')
      .eq('ingredient_hash', hash)
      .single();
    if (data?.flagged) {
      supabase
        .from('scans')
        .update({ scan_count: data.scan_count + 1 })
        .eq('ingredient_hash', hash)
        .then(({ error }) => { if (error) console.error(error); });
      return data.flagged;
    }
  } catch { /* cache miss or Supabase unavailable — fall through to Edge Function */ }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const response = await fetch(
    `${supabaseUrl}/functions/v1/analyze-ingredients`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ imageBase64: base64, mediaType }),
    }
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Analysis failed. Please try again.');
  }

  const parsed = await response.json();

  if (parsed.error) {
    throw new Error(parsed.error);
  }

  if (typeof parsed.score !== "number" || !Array.isArray(parsed.flagged)) {
    throw new Error(
      "Incomplete analysis returned. Try a clearer photo of the ingredient list.",
    );
  }

  // Cache miss — persist result for future lookups (fire-and-forget)
  if (hash) {
    supabase.from('scans').insert({
      ingredient_hash: hash,
      ingredients_raw: parsed.flagged.map(i => i.name).join(', '),
      score: parsed.score,
      flagged: parsed,
      scan_count: 1,
    }).then(({ error }) => { if (error) console.error(error); });
  }

  return parsed;
}
