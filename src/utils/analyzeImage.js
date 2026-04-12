import Anthropic from '@anthropic-ai/sdk';

const PROMPT = `You are an ingredient safety expert. Analyze these product ingredients and respond ONLY in this exact JSON format:
{
  "score": number (1-10, 10 being safest),
  "verdict": "string (one line summary)",
  "ingredients": [
    {
      "name": "string",
      "status": "harmful" | "decent" | "safe",
      "reason": "string (one line why)"
    }
  ],
  "alternatives": ["string"] (3 generic safer product type suggestions, no brand names)
}
If the image does not show ingredient text clearly, return: {"error": "Image unclear or no ingredient list visible. Please try a closer, well-lit photo."}`;

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
