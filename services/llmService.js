require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

async function callLLM(promptText) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }]
    })
  });

  const data = await response.json();

  if (!data.candidates || !data.candidates[0]) {
    throw new Error('No response from LLM: ' + JSON.stringify(data));
  }

  let rawText = data.candidates[0].content.parts[0].text.trim();
  rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

  try {
    return JSON.parse(rawText);
  } catch (err) {
    throw new Error('Failed to parse LLM JSON: ' + rawText);
  }
}

async function getStageAdvisory(breed, ageInWeeks, housingType, stage) {
  const prompt = `You are a poultry farm advisor specializing in layer (egg-producing) birds.
Flock details: Breed: ${breed}, Age: ${ageInWeeks} weeks, Housing: ${housingType}, Current stage: ${stage}

Give advice specific to this exact stage only — do not give general lifecycle advice.
Return ONLY valid JSON, no other text, in this exact format:
{
  "feedRecommendation": "...",
  "lightingSchedule": "...",
  "vaccinationDue": ["..."],
  "riskAlerts": ["..."]
}`;

  return await callLLM(prompt);
}

async function diagnoseSymptom(ageInWeeks, stage, symptoms) {
  const prompt = `You are diagnosing a poultry production issue. Only consider causes well-documented in layer poultry (e.g., Newcastle disease, infectious bronchitis, coccidiosis, heat stress, calcium deficiency, lighting program error, molting, feed transition stress).

Flock age: ${ageInWeeks} weeks. Current lay stage: ${stage}.
Symptom/issue reported: "${symptoms}"

If symptoms don't clearly match a known issue, say so rather than guessing.
Always include a note to consult a veterinarian for confirmation.

Return ONLY valid JSON, no other text, in this exact format:
{
  "likelyCause": "...",
  "confidence": "low | medium | high",
  "recommendedAction": "...",
  "note": "Consult a veterinarian to confirm this diagnosis."
}`;

  return await callLLM(prompt);
}

module.exports = { getStageAdvisory, diagnoseSymptom };