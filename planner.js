import dotenv from "dotenv";
dotenv.config();

import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

function buildSystemPrompt(courseTitle, courseOverview, targetAudience, numModules) {
  return `
Create a JSON course plan. Use this EXACT structure. Replace content but keep structure identical.

{
  "courseTitle": "${courseTitle}",
  "overview": "${courseOverview}",
  "audience": "${targetAudience}",
  "modules": [
    {
      "moduleName": "Module 1",
      "description": "Description here",
      "submodules": [
        {
          "name": "Submodule 1",
          "description": "Description here",
          "videoLecture": "Video title",
          "summary": "Summary here",
          "quiz": [
            {
              "question": "Question here?",
              "options": ["A", "B", "C", "D"],
              "answer": "A"
            }
          ]
        }
      ],
      "assignment": "Assignment description"
    }
  ],
  "capstoneProject": {
    "title": "Project title",
    "description": "Project description"
  }
}

Requirements:
- Create exactly ${numModules} modules
- Each module has 1-2 submodules maximum
- Keep all text under 50 characters
- Ensure all brackets and commas are correct
- Return only valid JSON, no other text`;
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
      max_tokens: 4000, // Add this to prevent truncation
      temperature: 0.1,  // Lower temperature for more consistent output
    });

    const raw = response.choices[0]?.message?.content;
    console.log("Raw response length:", raw?.length);
    console.log("Raw response:", raw);

    try {
      const parsed = JSON.parse(raw);
      return parsed;
    } catch (parseErr) {
      console.error("🚨 Model returned invalid JSON:\n", raw);
      throw new Error("Parsing error: model returned invalid JSON structure.");
    }

  } catch (err) {
    console.error("❌ Failed to generate course plan:", err);
    throw new Error("API error: " + err.message);
  }
}
