export const hashIngredients = async (text) => {
  const clean = text.toLowerCase().replace(/\s+/g, ' ').trim()
  const encoder = new TextEncoder()
  const data = encoder.encode(clean)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
