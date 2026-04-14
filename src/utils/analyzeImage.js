import Anthropic from '@anthropic-ai/sdk';

const PROMPT = `You are an ingredient safety expert specializing in consumer products sold in India — food, skincare, haircare, and household items.

Analyze the ingredient list visible in this image and respond ONLY in valid JSON. No explanation outside the JSON.

Assess each ingredient against known safety data: carcinogenicity, skin sensitization, endocrine disruption, irritation potential, allergen status, and regulatory bans (EU, India CDSCO where relevant).

Respond in this exact format:
{
  "confidence": "high" | "medium" | "low",
  "confidence_reason": "string (why — e.g. 'image partially blurry', 'non-English text', 'ingredient list truncated')",
  "score": number (1-10, 10 = safest),
  "score_rationale": "string (one sentence explaining the score)",
  "product_type": "food" | "skincare" | "haircare" | "household" | "unknown",
  "ingredients": [
    {
      "name": "string (ingredient name as seen in image)",
      "status": "harmful" | "moderate" | "safe",
      "concern_type": "carcinogen" | "allergen" | "irritant" | "endocrine_disruptor" | "banned_substance" | "none",
      "reason": "string (max 15 words, plain English, specific — e.g. 'linked to contact dermatitis in repeated use')"
    }
  ],
  "flagged_count": {
    "harmful": number,
    "moderate": number,
    "safe": number
  },
  "low_confidence_warning": "string | null (shown to user if confidence is low or medium — e.g. 'Ingredient list appears cut off. Results may be incomplete.')"
}

Scoring guide:
1-3: Multiple harmful ingredients, known carcinogens or banned substances present
4-5: Several moderate concerns, common irritants or sensitizers
6-7: Minor concerns, mostly safe with a few moderate ingredients
8-9: Mostly safe, 1-2 low-level concerns
10: No concerns identified

Rules:
- If image is unclear, blurry, or shows no ingredient list: return {"error": "Unable to read ingredient list. Please take a closer, well-lit photo of the ingredients panel."}
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
