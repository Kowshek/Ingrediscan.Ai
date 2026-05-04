// hashIngredients — for hashing ingredient TEXT (case-insensitive so OCR
// capitalisation variations don't cause content cache misses).
export const hashIngredients = async (text) => {
  const clean = text.toLowerCase().replace(/\s+/g, ' ').trim()
  const encoder = new TextEncoder()
  const data = encoder.encode(clean)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// hashImage — for hashing raw base64 image data to match the server-side
// sha256Hex() in the edge function. No normalization — must be byte-identical
// to what the server stores as ingredient_hash.
export const hashImage = async (base64) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(base64)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
