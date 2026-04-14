import Anthropic from '@anthropic-ai/sdk';

const PROMPT = `You are an ingredient safety expert specializing in consumer products sold in India — food, skincare, haircare, and household items.

Analyze the ingredient list visible in this image and respond ONLY in valid JSON. No explanation outside the JSON.

STRICT RULES BEFORE ANALYSIS:
- If the image shows a pharmaceutical product, medicine, drug, or supplement with active pharmaceutical ingredients (e.g. paracetamol, ibuprofen, cetirizine, amoxicillin, any API listed on a drug label): return {"error": "Medicine and pharmaceutical products are outside our scope. Please consult a doctor or pharmacist for drug safety information."}
- If image is unclear, blurry, or shows no ingredient list: return {"error": "Unable to read ingredient list. Please take a closer, well-lit photo of the ingredients panel."}

Assess each ingredient against known safety data: carcinogenicity, skin sensitization, endocrine disruption, irritation potential, allergen status, metabolic harm from regular use, and regulatory bans (EU, India CDSCO where relevant).

IMPORTANT — flag these as "moderate" with concern_type "frequent_use_concern" when found in food products:
- Palm oil, palm kernel oil (linked to cardiovascular risk at regular consumption)
- Maltodextrin, modified starch (high glycemic, spikes blood sugar)
- Added sugar, sugar syrup, glucose syrup, fructose, high-fructose corn syrup
- Artificial flavours, artificial flavouring, nature-identical flavouring
- Refined vegetable oils (sunflower, soybean, canola in high quantities)
- Sodium (if listed as a significant ingredient, not a trace mineral)
- Carrageenan (gut inflammation risk)
- Sodium benzoate, potassium sorbate (preservatives with cumulative concerns)
These are not acutely toxic but are harmful with regular consumption — say so clearly in the reason field.

Respond in this exact format:
{
  "confidence": "high" | "medium" | "low",
  "confidence_reason": "string",
  "score": number (1-10, 10 = safest),
  "score_rationale": "string (one sentence explaining the score)",
  "ingredients": [
    {
      "name": "string (ingredient name as seen in image)",
      "status": "harmful" | "moderate" | "safe",
      "concern_type": "carcinogen" | "allergen" | "irritant" | "endocrine_disruptor" | "banned_substance" | "frequent_use_concern" | "none",
      "reason": "string (max 15 words, plain English, specific)"
    }
  ],
  "flagged_count": {
    "harmful": number,
    "moderate": number,
    "safe": number
  },
  "low_confidence_warning": "string | null"
}

Scoring guide:
1-3: Multiple harmful ingredients, known carcinogens or banned substances present
4-5: Several moderate concerns, common irritants or sensitizers
6-7: Minor concerns, mostly safe with a few moderate ingredients — products with palm oil + maltodextrin + added sugar should land here at best
8-9: Mostly safe, 1-2 low-level concerns
10: No concerns identified

Rules:
- If text is in Hindi, Tamil, or another Indian language: attempt analysis, set confidence to "medium" or "low" accordingly
- If ingredient list appears truncated or cut off at edges: set low_confidence_warning
- Do NOT guess product name
- Do NOT include ingredients not visible in the image
- ONLY return JSON — no preamble, no explanation outside the object`;



function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

export async function analyzeIngredients(imageFile) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('No API key configured. Add VITE_ANTHROPIC_API_KEY to your .env file.');
  }

  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const base64 = await fileToBase64(imageFile);

  const mediaType = imageFile.type || 'image/jpeg';

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64,
            },
          },
          {
            type: 'text',
            text: PROMPT,
          },
        ],
      },
    ],
  });

  const text = response.content[0]?.text ?? '';

  // Strip markdown code fences if present
  const cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error('Could not parse AI response. Please try again.');
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Invalid response format. Please try again.');
  }

  if (parsed.error) {
    throw new Error(parsed.error);
  }

  if (typeof parsed.score !== 'number' || !Array.isArray(parsed.ingredients)) {
    throw new Error('Incomplete analysis returned. Try a clearer photo of the ingredient list.');
  }

  return parsed;
}
