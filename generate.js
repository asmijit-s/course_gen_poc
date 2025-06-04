import fetch from "node-fetch";
import { getCourseSchema } from "./schema.js";

const payload = {
  courseTitle: "Introduction to Data Science with Python.",
  courseOverview: "The course will cover foundational statistics, data handling, machine learning, and real-world applications.",
  targetAudience: "beginners with basic programming knowledge",
  numModules: 3
};

const runTest = async () => {
  try {
    const res = await fetch("http://localhost:3003/generate-plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const rawText = await res.text();

    let json;
    try {
      json = JSON.parse(rawText);
    } catch (parseErr) {
      console.error("❌ Failed to parse response JSON:", rawText);
      throw new Error("Invalid JSON returned:\n" + parseErr.message);
    }

    if (!json.success) {
      console.error("❌ Server responded with error:", json.error);
      return;
    }

    let courseData;
    try {
      // Check if json.data is a stringified JSON or an actual object
      courseData = typeof json.data === "string" ? JSON.parse(json.data) : json.data;
    } catch (err) {
      console.error("❌ Failed to parse course data from response:");
      console.error("Data content:", json.data);
      throw new Error("Parsing `data` failed: " + err.message);
    }

    const result = getCourseSchema.safeParse(courseData);
    if (!result.success) {
      console.error("❌ Validation failed:");
      console.error(JSON.stringify(result.error.format(), null, 2));
    } else {
      console.log("✅ Validated Course Plan:");
      console.log(JSON.stringify(result.data, null, 2));
    }
  } catch (err) {
    console.error("❌ Error during request:", err.message);
  }
};

runTest();
