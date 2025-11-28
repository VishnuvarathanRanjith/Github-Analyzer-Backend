const fs = require("fs");


function generateFinalDeveloperDocument(fullReport) {
const content = `
===== AI DEVELOPER PROFILE REPORT =====


Overall Score: ${fullReport.numeric.overall_score}


--- SKILLS ---
Frontend: ${fullReport.numeric.skills.frontend}
Backend: ${fullReport.numeric.skills.backend}
Blockchain: ${fullReport.numeric.skills.blockchain}
DevOps: ${fullReport.numeric.skills.devops}


--- PRODUCTIVITY ---
Commits: ${fullReport.numeric.productivity.commits}
Pull Requests: ${fullReport.numeric.productivity.pull_requests}
Issues: ${fullReport.numeric.productivity.issues}


--- CAREER FIT ---
Frontend: ${fullReport.numeric.career_fit.frontend}
FullStack: ${fullReport.numeric.career_fit.fullstack}
Blockchain: ${fullReport.numeric.career_fit.blockchain}


--- CHARTS ---
${JSON.stringify(fullReport.charts, null, 2)}


--- RAW AI TEXT ANALYSIS ---
${JSON.stringify(fullReport.textAI, null, 2)}
`;


fs.writeFileSync("developer_full_profile.txt", content);
}


module.exports = { generateFinalDeveloperDocument };