// 📄 server.js
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { generateCoursePlan } from "./planner_gemini.js";
import { getCourseSchema } from "./schema.js";
import fs from "fs";
import path from "path";
const app = express();
const PORT = process.env.PORT || 3003;

app.use(bodyParser.json());
app.use(cors());
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.json({ status: "Server is running" });
});

app.post("/generate-plan", async (req, res) => {
  const { courseTitle, courseOverview, targetAudience, numModules } = req.body;

  if (!courseTitle || !courseOverview || !targetAudience || !numModules) {
    return res.status(400).json({
      error: "Missing required parameters: courseTitle, courseOverview, targetAudience, numModules",
    });
  }

  try {
    const coursePlan = await generateCoursePlan(courseTitle, courseOverview, targetAudience, numModules);
    console.log("Final Course Plan (from /generate-plan route):");
    console.dir(coursePlan, { depth: null, colors: true });
    const schema = getCourseSchema(numModules);
    const result = schema.safeParse(coursePlan);

    if (!result.success) {
      console.error("Validation failed:", result.error);
      return res.status(400).json({
        success: false,
        error: "Schema validation failed",
        details: result.error.errors,
      });
    }
    const sanitize = (str) => str.replace(/[^a-z0-9]/gi, "_");
    const sanitizedTitle = sanitize(courseTitle);
    const sanitizedAudience = sanitize(targetAudience);
    const fileName = `${sanitizedTitle}_${sanitizedAudience}.json`;
    const filePath = path.join("output", fileName);

  // Ensure output folder exists
    if (!fs.existsSync("output")) {
    fs.mkdirSync("output");
    }

  // Save result to file
  fs.writeFileSync(filePath, JSON.stringify(result.data, null, 2));

    res.json({ success: true, data: result.data });
  } catch (err) {
    console.error("Error generating course plan:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "Server is running" });
});

app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API endpoint: POST http://localhost:${PORT}/generate-plan`);
});

