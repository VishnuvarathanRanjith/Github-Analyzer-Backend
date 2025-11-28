const axios = require("axios");
const { cleanJson } = require("./utils/cleanAIJson");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;


async function convertTextToNumbers(textAnalysis, log = () => {}) {
    const addLog = (message, data) => log(message, data);

    addLog("📊 [NUMERIC AI] Preparing numeric conversion request");
    const prompt = `Convert this AI developer analysis into PURE NUMERIC SCORES (0–100).
Return STRICT JSON only:


{
"overall_score": 0,
"skills": { "frontend": 0, "backend": 0, "blockchain": 0, "devops": 0 },
"languages": { "JavaScript": 0, "React": 0, "Solidity": 0, "TypeScript": 0 },
"career_fit": { "frontend": 0, "fullstack": 0, "blockchain": 0 },
"productivity": { "commits": 0, "pull_requests": 0, "issues": 0 }
}


AI Skill Analysis:
${JSON.stringify(textAnalysis)}
`;


    addLog("🌐 [NUMERIC AI] Calling Gemini for numeric conversion");
    const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        { contents: [{ role: "user", parts: [{ text: prompt }] }] }
    );


    const raw = response.data.candidates[0].content.parts[0].text;
    const cleaned = cleanJson(raw);
    addLog("✅ [NUMERIC AI] Numeric conversion result", cleaned);
    return cleaned;
}


module.exports = { convertTextToNumbers };