/**
 * server.js
 *
 * GitHub Analyzer + AI Skill Analysis Backend
 */



const express = require("express");
const axios = require("axios");
const cors = require("cors");
const dotenv = require("dotenv");
const { analyzeDeveloperWithAI } = require("./ai.controller.js");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" })); // increase payload limit

const PORT = process.env.PORT || 5000;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || null;
const USER_AGENT = "GitHub-Analyzer-Tool/1.0";

// console.log("✅ GEMINI API KEY Loaded:", !!process.env.GEMINI_API_KEY);
// console.log("✅ GITHUB TOKEN Loaded:", !!GITHUB_TOKEN);

// -----------------------------------
// EXTENSION -> LANGUAGE MAP
// -----------------------------------
const EXT_LANGUAGE_MAP = {
  ".c": "C",
  ".cpp": "C++",
  ".cs": "C#",
  ".css": "CSS",
  ".dart": "Dart",
  ".go": "Go",
  ".html": "HTML",
  ".java": "Java",
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".json": "JSON",
  ".kt": "Kotlin",
  ".less": "CSS",
  ".md": "Markdown",
  ".mjs": "JavaScript",
  ".php": "PHP",
  ".pl": "Perl",
  ".py": "Python",
  ".rb": "Ruby",
  ".rs": "Rust",
  ".scss": "CSS",
  ".sh": "Shell",
  ".sol": "Solidity",
  ".sql": "SQL",
  ".swift": "Swift",
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".vue": "Vue",
  ".yaml": "YAML",
  ".yml": "YAML",
};

const CODE_EXTENSIONS = new Set(Object.keys(EXT_LANGUAGE_MAP));
const NON_CODE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".ico",
  ".bmp",
  ".webp",
  ".mp4",
  ".mp3",
  ".mov",
  ".avi",
  ".zip",
  ".tar",
  ".gz",
  ".7z",
  ".rar",
  ".pdf",
  ".exe",
  ".dll",
  ".bin",
  ".lock",
  ".ttf",
  ".otf",
  ".woff",
  ".woff2",
]);

const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  "dist",
  "build",
  ".next",
  ".git",
  ".github",
  ".yarn",
  ".turbo",
  ".cache",
  ".idea",
  ".vscode",
  "__pycache__",
  "venv",
  "env",
  "coverage",
  "target",
  ".gradle",
  "android",
  "ios",
  ".expo",
]);

const SKILL_CATEGORY_MAP = {
  frontend: ["javascript", "typescript"],
  backend: ["python", "java", "node"],
  blockchain: ["solidity"],
  devops: ["dockerfile", "yaml", "yml"],
};

// -----------------------------------
// AXIOS SETUP FOR GITHUB
// -----------------------------------
const axiosGit = axios.create({
  baseURL: "https://api.github.com",
  headers: {
    "User-Agent": USER_AGENT,
    Accept: "application/vnd.github.v3+json",
    ...(GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {})
  }
});

// -----------------------------------
// HELPERS
// -----------------------------------
function extractUsername(input) {
  if (!input) return null;
  input = input.trim();
  if (input.includes("github.com")) {
    const parts = input.split("/").filter(Boolean);
    return parts[parts.length - 1];
  }
  return input;
}

async function fetchUserProfile(username) {
  try {
    const { data } = await axiosGit.get(`/users/${username}`);
    return data;
  } catch (err) {
    console.error("❌ GitHub Profile Error:", err.response?.status, err.message);
    return null;
  }
}

async function fetchUserRepos(username) {
  try {
    const { data } = await axiosGit.get(`/users/${username}/repos?per_page=100`);
    return data;
  } catch (err) {
    console.error("❌ GitHub Repo Error:", err.response?.status, err.message);
    return null;
  }
}

async function fetchRepoContents(owner, repo, repoPath = "") {
  try {
    const pathPart = repoPath ? `/${repoPath}` : "";
    const { data } = await axiosGit.get(`/repos/${owner}/${repo}/contents${pathPart}`);
    return data;
  } catch {
    return null;
  }
}

function getExtensionFromName(name) {
  const idx = name.lastIndexOf(".");
  if (idx === -1) return "";
  return name.substring(idx).toLowerCase();
}

function isCodeFile(name) {
  const ext = getExtensionFromName(name);
  if (!ext) return false;
  if (NON_CODE_EXTENSIONS.has(ext)) return false;
  return CODE_EXTENSIONS.has(ext);
}

function shouldSkipDirectory(name = "") {
  return IGNORED_DIRECTORIES.has(name.toLowerCase());
}

async function crawlRepo(owner, repo, repoPath = "", acc = []) {
  const items = await fetchRepoContents(owner, repo, repoPath);
  if (!items) return acc;

  if (!Array.isArray(items)) {
    acc.push(items);
    return acc;
  }

  for (const item of items) {
    if (item.type === "dir") {
      if (shouldSkipDirectory(item.name)) {
        continue;
      }
      await crawlRepo(owner, repo, item.path, acc);
    } else if (item.type === "file") {
      if (!isCodeFile(item.name)) {
        continue;
      }
      acc.push(item);
    }
  }
  return acc;
}

// -----------------------------------
// ANALYZE REPO
// -----------------------------------
async function analyzeRepo(owner, repoObj) {
  const files = await crawlRepo(owner, repoObj.name, "", []);

  const extCounts = {};
  const langCounts = {};
  let totalBytes = 0;

  for (const f of files) {
    const ext = getExtensionFromName(f.name);
    totalBytes += f.size || 0;

    extCounts[ext] = (extCounts[ext] || 0) + 1;

    const lang = EXT_LANGUAGE_MAP[ext] || "Unknown";
    langCounts[lang] = (langCounts[lang] || 0) + 1;
  }

  return {
    repoName: repoObj.name,
    repoUrl: repoObj.html_url,
    primaryLanguage: repoObj.language,
    totalFiles: files.length,
    totalBytes,
    extCounts,
    langCounts,
    inferredTechStack: Object.keys(langCounts).map(l => ({
      name: l,
      confidence: 0.8
    }))
  };
}

// -----------------------------------
// AGGREGATE
// -----------------------------------
function aggregateResults(repoAnalyses) {
  const agg = {
    totalRepos: repoAnalyses.length,
    totalFiles: 0,
    totalBytes: 0,
    languageCounts: {}
  };

  for (const r of repoAnalyses) {
    agg.totalFiles += r.totalFiles;
    agg.totalBytes += r.totalBytes;

    for (const [lang, c] of Object.entries(r.langCounts)) {
      agg.languageCounts[lang] = (agg.languageCounts[lang] || 0) + c;
    }
  }

  return agg;
}

function buildLanguageChart(languageCounts = {}) {
  return Object.entries(languageCounts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([label, value]) => ({ label, value }));
}

function buildRepoStarsChart(repos = []) {
  return [...repos]
    .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
    .slice(0, 6)
    .map((repo) => ({
      label: repo.name,
      value: repo.stargazers_count || 0,
    }));
}

function buildRepoContributionChart(repoAnalyses = []) {
  return [...repoAnalyses]
    .sort((a, b) => (b.totalFiles || 0) - (a.totalFiles || 0))
    .slice(0, 6)
    .map((repo) => ({
      label: repo.repoName,
      value: repo.totalFiles || 0,
    }));
}

function buildActivityTimeline(repos = []) {
  const counts = {};
  for (const repo of repos) {
    if (!repo.pushed_at) continue;
    const monthKey = new Date(repo.pushed_at).toISOString().slice(0, 7);
    counts[monthKey] = (counts[monthKey] || 0) + 1;
  }

  return Object.entries(counts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([label, value]) => ({ label, value }));
}

function buildChartData(repoAnalyses, aggregate, repos) {
  return {
    languageUsage: buildLanguageChart(aggregate.languageCounts),
    topStars: buildRepoStarsChart(repos),
    repoContribution: buildRepoContributionChart(repoAnalyses),
    activityTimeline: buildActivityTimeline(repos),
  };
}

function buildSkillCategories(languageCounts = {}) {
  const categoryTotals = {
    frontend: 0,
    backend: 0,
    blockchain: 0,
    devops: 0,
  };

  for (const [language, count] of Object.entries(languageCounts)) {
    const normalized = language?.trim().toLowerCase();
    if (!normalized) continue;

    if (SKILL_CATEGORY_MAP.frontend.includes(normalized)) {
      categoryTotals.frontend += count;
    }
    if (SKILL_CATEGORY_MAP.backend.includes(normalized)) {
      categoryTotals.backend += count;
    }
    if (SKILL_CATEGORY_MAP.blockchain.includes(normalized)) {
      categoryTotals.blockchain += count;
    }
    if (SKILL_CATEGORY_MAP.devops.includes(normalized)) {
      categoryTotals.devops += count;
    }
  }

  return Object.entries(categoryTotals)
    .filter(([, value]) => value > 0)
    .map(([label, value]) => ({
      label,
      value,
    }));
}

// ===================================
// ✅ MAIN ROUTES
// ===================================

// GITHUB ANALYSIS ROUTE
app.get("/analyze", async (req, res) => {
  const input = req.query.user;
  // console.log("➡️ [GET /analyze] Incoming request:", input);
  if (!input) {
    // console.log("⚠️ [GET /analyze] Missing user param");
    return res.status(400).json({ error: "Provide ?user=username" });
  }

  const username = extractUsername(input);
  // console.log("👤 [GET /analyze] Resolved username:", username);

  const profile = await fetchUserProfile(username);
  if (!profile) {
    // console.log("❌ [GET /analyze] Profile not found for", username);
    return res.status(404).json({ error: "User not found" });
  }

  const repos = await fetchUserRepos(username);
  if (!repos) {
    // console.log("❌ [GET /analyze] No repos found for", username);
    return res.status(404).json({ error: "No repos found" });
  }

  const repoAnalyses = [];
  for (const repo of repos) {
    // console.log("🔍 [GET /analyze] Analyzing repo:", repo.name);
    const analysis = await analyzeRepo(username, repo);
    repoAnalyses.push(analysis);
  }

  const aggregate = aggregateResults(repoAnalyses);
  const charts = buildChartData(repoAnalyses, aggregate, repos);
  const skillCategories = buildSkillCategories(aggregate.languageCounts);
  const totals = {
    stars: repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0),
    forks: repos.reduce((sum, repo) => sum + (repo.forks_count || 0), 0),
  };

  const payload = {
    generatedAt: new Date().toISOString(),
    username: profile.login,
    profile: {
      name: profile.name,
      avatar_url: profile.avatar_url,
      html_url: profile.html_url,
      bio: profile.bio,
    },
    metrics: {
      reposAnalyzed: aggregate.totalRepos,
      filesScanned: aggregate.totalFiles,
      codeVolumeBytes: aggregate.totalBytes,
      totalStars: totals.stars,
      totalForks: totals.forks,
    },
    skills: {
      categories: skillCategories,
    },
    repos: repoAnalyses,
    aggregate,
    charts,
    techStackHighlights: charts.languageUsage.slice(0, 6).map((item) => item.label),
  };

  // console.log("✅ [GET /analyze] Response payload:", JSON.stringify(payload));
  res.json(payload);
});

// AI SKILL ANALYZER ROUTE
app.post("/ai/skill-analysis", async (req, res) => {
  try {
    // console.log("➡️ [POST /ai/skill-analysis] Payload:", JSON.stringify(req.body));
    const githubData = req.body;

    // Limit size to prevent Gemini API overload
    const payload = JSON.stringify(githubData).slice(0, 15000);

    const aiResult = await analyzeDeveloperWithAI(JSON.parse(payload));

    const responsePayload = {
      success: true,
      ai_analysis: aiResult
    };
    // console.log("✅ [POST /ai/skill-analysis] Response:", JSON.stringify(responsePayload));

    res.json(responsePayload);

  } catch (err) {
    console.error("AI ERROR:", err.message);
    res.status(500).json({
      success: false,
      error: "AI analysis failed",
      details: err.response?.data || err.message
    });
  }
});


const { runFullAIPipeline } = require("./pipeline.controller");


app.post("/ai/full-analysis", async (req, res) => {
  try {
    // console.log("➡️ [POST /ai/full-analysis] Request received");
    
    // Extract profileData from request body (frontend sends { profileData })
    const githubData = req.body.profileData || req.body;
    
    if (!githubData || Object.keys(githubData).length === 0) {
      // console.log("⚠️ [POST /ai/full-analysis] Invalid request: no data provided");
      return res.status(400).json({ 
        success: false, 
        error: "Invalid request: profileData is required" 
      });
    }

    // console.log("📥 [POST /ai/full-analysis] Processing GitHub data for:", githubData.username || "unknown");
    
    const result = await runFullAIPipeline(githubData);

    const responsePayload = {
      success: true,
      text_analysis: result.textAI,
      numeric_analysis: result.numeric,
      visualizations: result.charts,
      logs: result.logs
    };
    // console.log("✅ [POST /ai/full-analysis] Response generated successfully");

    res.json(responsePayload);
  } catch (err) {
    console.error("❌ [POST /ai/full-analysis] FULL PIPELINE ERROR:", err.message);
    console.error("Error stack:", err.stack);
    res.status(500).json({ 
      success: false, 
      error: err.message || "Internal server error during AI analysis" 
    });
  }
});
// SERVER START
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
