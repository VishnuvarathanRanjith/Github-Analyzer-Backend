function cleanJson(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("❌ Invalid JSON returned by AI");
    }
    return JSON.parse(match[0]);
  }
}

module.exports = { cleanJson };
