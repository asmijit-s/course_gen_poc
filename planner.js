import dotenv from "dotenv";
dotenv.config();

import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

function buildSystemPrompt(courseTitle, courseOverview, targetAudience, numModules) {
  return `
You are a curriculum planner AI. You must return a valid, machine-readable JSON object ONLY — no Markdown, no code blocks, no free text, no commentary.

### Course Definition:
- Course Title: "${courseTitle}"
- Overview: "${courseOverview}"
- Audience: "${targetAudience}"
- Modules: ${numModules}
- Difficulty: suitable for "${targetAudience}" to Advanced

### Requirements:
- Structure the course with strictly ${numModules} modules.
- Each module must include:
  - "moduleName": string
  - "description": string
  - "submodules": an array with 1 to 3 submodules. Each must be an object with:
    - "name": string
    - "description": string (must have a key, not just a value)
    - "videoLecture": string
    - "summary": string
    - "quiz": array of exactly one object with:
      - "question": string
      - "options": array of exactly four distinct strings
      - "answer": one of the options
  - "assignment": string

- Add a "capstoneProject" at the end with:
  - "title": string
  - "description": string

### Format:
- Response MUST be a valid JSON object.
- DO NOT include markdown, code fences, or any free text.
- DO NOT omit or rename any fields.
- All string values must be double-quoted.
- Escape any internal quotes.
- Use correct JSON syntax and nesting.
- Do not output arrays or objects partially — every object must have complete keys and values.

Return only valid JSON matching this exact structure.
`;
}

export async function generateCoursePlan(courseTitle, courseOverview, targetAudience, numModules) {
  const systemPrompt = buildSystemPrompt(courseTitle, courseOverview, targetAudience, numModules);

  try {
    const response = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: systemPrompt,
        }
      ],
    });

    const raw = response.choices[0].message.content;

    // Basic sanity check for JSON validity
    try {
      JSON.parse(raw);
    } catch (e) {
      console.error("🚨 Model returned invalid JSON:\n", raw);
      throw new Error("Parsing error: model returned invalid JSON structure.");
    }

    return raw;
  } catch (err) {
    console.error("❌ Failed to generate course plan:", err);
    throw new Error("Parsing error: " + err.message);
  }
}
