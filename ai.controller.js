const axios = require("axios");
const dotenv = require("dotenv");
const { cleanJson } = require("./utils/cleanAIJson");
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function analyzeDeveloperWithAI(githubData, log = () => {}) {
  const addLog = (message, data) => {
    log(message, data);
  };

  addLog("🧠 [AI] Preparing prompt for analyzeDeveloperWithAI");
  const promptText = `
You are a senior software architect and technical recruiter.
Analyze this GitHub developer profile and return STRICT JSON ONLY with the following shape:

{
  "skill_level": "",
  "developer_type": "",
  "strengths": [],
  "weaknesses": [],
  "skill_gaps": [],
  "career_suggestions": [],
  "learning_roadmap": [],
  "linkedin_post": "",
  "resume_summary": "",
  "career_feedback": ""
}

GitHub Summary:
${JSON.stringify(githubData)}
`;

  try {
    addLog("🌐 [AI] Calling Gemini for text analysis");
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            role: "user",
            parts: [
              { text: promptText }
            ]
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    const aiText =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const parsed = cleanJson(aiText);
    addLog("📄 [AI] Gemini text analysis result", parsed);

    return parsed;

  } catch (err) {
    const serialized = err.response?.data || err.message;
    addLog("❌ [AI] Gemini text analysis failed", serialized);
    console.error("Gemini API FULL ERROR:", serialized);
    throw err;
  }
}

module.exports = { analyzeDeveloperWithAI };
