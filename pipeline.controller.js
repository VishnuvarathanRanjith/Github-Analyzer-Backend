const { analyzeDeveloperWithAI } = require("./ai.controller");
const { convertTextToNumbers  } = require("./ai.numeric.controller");
const { generateChartsFromNumbers } = require("./ai.chart.controller");

function formatPayload(data) {
  if (data === undefined || data === null) return "";
  if (typeof data === "string") return data;
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

function createLogger() {
  const logs = [];
  const addLog = (message, data) => {
    const payload = formatPayload(data);
    const formattedPayload =
      payload && payload.length > 1200 ? `${payload.slice(0, 1200)}...` : payload;
    const entry = formattedPayload ? `${message}: ${formattedPayload}` : message;
    logs.push(entry);
    console.log(entry);
  };
  return { addLog, logs };
}

async function runFullAIPipeline(githubData) {
  const { addLog, logs } = createLogger();
  addLog("🚀 [PIPELINE] Starting full AI pipeline");
  addLog("📥 [PIPELINE] Incoming GitHub data summary", githubData);

  addLog("🧠 [PIPELINE] Step 1 -> analyzeDeveloperWithAI");
  const textAI = await analyzeDeveloperWithAI(githubData, addLog);
  addLog("✅ [PIPELINE] Text AI output", textAI);

  addLog("📊 [PIPELINE] Step 2 -> convertTextToNumbers");
  const numeric = await convertTextToNumbers(textAI, addLog);
  addLog("✅ [PIPELINE] Numeric AI output", numeric);

  addLog("📈 [PIPELINE] Step 3 -> generateChartsFromNumbers");
  const charts = await generateChartsFromNumbers(numeric, addLog);
  addLog("✅ [PIPELINE] Chart AI output", charts);

  addLog("🏁 [PIPELINE] Full AI pipeline completed");
  return {
    textAI,
    numeric,
    charts,
    logs,
  };
}

module.exports = { runFullAIPipeline };
