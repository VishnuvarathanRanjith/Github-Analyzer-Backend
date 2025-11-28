const axios = require("axios");
require("dotenv").config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function generateChartsFromNumbers(numericData, log = () => {}) {
  const addLog = (message, data) => log(message, data);
  addLog("📈 [CHART AI] Generating visualization prompt");
  const prompt = `
You are a data visualization AI.
Convert this numeric developer data into chart-ready JSON ONLY.

Return STRICT JSON ONLY in this format:

{
  "charts": [
    {
      "title": "Skill Distribution",
      "type": "bar",
      "data": [
        { "label": "Frontend", "value": 0 },
        { "label": "Backend", "value": 0 }
      ]
    }
  ]
}

Numeric Data:
${JSON.stringify(numericData)}
`;

  addLog("🌐 [CHART AI] Calling Gemini for charts");
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ]
    },
    {
      headers: { "Content-Type": "application/json" }
    }
  );

  const raw =
    response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

  const clean = raw.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);
  addLog("✅ [CHART AI] Chart JSON result", parsed);
  return parsed;
}

/* ✅ THIS EXPORT WAS MISSING — THIS CAUSED YOUR ERROR */
module.exports = { generateChartsFromNumbers };
