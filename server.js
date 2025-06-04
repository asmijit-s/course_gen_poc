// 📄 server.js
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { generateCoursePlan } from "./planner.js";
import { getCourseSchema } from "./schema.js";

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
