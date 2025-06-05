    import dotenv from "dotenv";
dotenv.config();

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function buildSystemPrompt(courseTitle, courseOverview, targetAudience, numModules) {
  return `You are an expert course designer. Create a comprehensive course plan in PERFECT JSON format.

COURSE INFORMATION:
- Title: ${courseTitle}
- Overview: ${courseOverview}
- Target Audience: ${targetAudience}
- Number of Modules Required: ${numModules}

You MUST return a JSON object with this EXACT structure. Only structural change you must do is, produce as many submodules as required. Comprehensive topic coverage is a priority. Every field is MANDATORY and must have the correct field name:

{
  "courseTitle": "${courseTitle}",
  "overview": "${courseOverview}",
  "audience": "${targetAudience}",
  "modules": [
    {
      "moduleName": "Module 1: [Descriptive Name]",
      "description": "A detailed description of at least 20 words explaining what students will learn in this module and why it is important.",
      "submodules": [
        {
          "name": "Submodule 1.1: [Specific Topic]",
          "description": "A clear description of at least 15 words explaining the specific concepts covered in this submodule.",
          "videoLecture": "Descriptive Video Title Here",
          "summary": "A concise summary of at least 10 words highlighting the key learning points.",
          "quiz": [
            {
              "question": "A clear multiple choice question ending with a question mark?",
              "options": ["First option", "Second option", "Third option", "Fourth option"],
              "answer": "First option"
            }
          ]
        }
      ],
      "assignment": "A practical assignment description of at least 15 words that helps students apply what they learned."
    }
  ],
  "capstoneProject": {
    "title": "Meaningful Project Title",
    "description": "A comprehensive project description of at least 20 words that ties together all course concepts."
  }
}
SUBMODULE GUIDELINES:
- Each module must include AS MANY submodules as needed to fully cover the module's topic.
- Avoid generating a fixed or default number of submodules like 2 unless it is truly sufficient.
- Deep and granular topic decomposition is preferred. Think: 3 to 6+ submodules per module if needed.
- Each submodule must address a **unique** and **distinct concept**, not duplicates or overlapping ideas.

CRITICAL JSON REQUIREMENTS:
1. MUST have exactly ${numModules} modules in the "modules" array
2. Each submodule MUST have ALL 5 fields: "name", "description", "videoLecture", "summary", "quiz"
3. Make sure number of submodules exhaust the module topic.
4. Pay special attention to the "summary" field - it MUST be labeled correctly as "summary":
5. Each quiz MUST be an array with exactly 1 question object
6. Each question MUST have exactly 4 options in "options" array
7. The "answer" MUST be one of the exact strings from "options"
8. NO missing commas, brackets, or quotes
9. NO trailing commas
10. ALL field names must be exactly as shown with proper quotes

DOUBLE CHECK:
- Every submodule has: name, description, videoLecture, summary, quiz
- The "summary" field is properly labeled with quotes
- All brackets and braces are properly closed
- No trailing commas before closing brackets

Return ONLY valid JSON, no extra text, no markdown, no explanations.`;
}

export async function generateCoursePlan(courseTitle, courseOverview, targetAudience, numModules) {
  const systemPrompt = buildSystemPrompt(courseTitle, courseOverview, targetAudience, numModules);

  // Retry logic for better reliability
  const maxRetries = 5;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Generating course plan for: ${courseTitle} (Attempt ${attempt}/${maxRetries})`);
      
      // Get the generative model
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash-exp",
        generationConfig: {
          temperature: 0.2,
          topP: 0.9,
          topK: 40,
          //maxOutputTokens: 8192,
          responseMimeType: "application/json",
        },
      });

      const prompt = `${systemPrompt}

Generate a complete course plan with proper JSON structure. 

CRITICAL: Each submodule MUST have these 5 fields with proper labels:
- "name": "..."
- "description": "..."
- "videoLecture": "..."
- "summary": "..." (THIS FIELD IS OFTEN MISSING THE LABEL!)
- "quiz": [...]

Course Details:
- Title: ${courseTitle}
- Overview: ${courseOverview}
- Target Audience: ${targetAudience}
- Number of Modules: ${numModules}
Ensure the difficulty of topics is in line with bloom's taxonomy after analysing ${targetAudience}.
The initial difficulty will be decided by ${targetAudience} and described in ${courseOverview} and go to advanced difficulty.
Structure the modules and their orders as per your reasoning.
Return ONLY valid, complete JSON with all field labels properly quoted.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const raw = response.text();

      console.log(`Raw response preview (Attempt ${attempt}):`, raw?.substring(0, 200) + "...");

      if (!raw) {
        throw new Error("Empty response from API");
      }

      // Clean the response to ensure it's valid JSON
      let cleanedResponse = raw.trim();
      
      // Remove any markdown code blocks if present
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/, '').replace(/\n?```$/, '');
      }

      // Fix common JSON issues
      cleanedResponse = fixCommonJsonIssues(cleanedResponse);

      try {
        const parsed = JSON.parse(cleanedResponse);
        
        // Comprehensive validation
        validateCourseStructure(parsed, numModules);
        
        console.log("Successfully generated and validated course for:", parsed.courseTitle);
        return parsed;
        
      } catch (parseErr) {
        console.error(`JSON Parse/Validation Error (Attempt ${attempt}):`, parseErr.message);
        if (attempt === maxRetries) {
          console.error("Raw response:", raw);
          console.error("Cleaned response:", cleanedResponse);
          
          // Try to identify the specific issue
          identifyJsonIssues(cleanedResponse);
        }
        lastError = new Error("Failed to parse/validate AI response: " + parseErr.message);
        
        // If it's the last attempt, throw the error
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
    } catch (err) {
      console.error(`API Error (Attempt ${attempt}):`, err.message);
      lastError = err;
      
      if (attempt === maxRetries) {
        throw new Error("Failed to generate course plan after " + maxRetries + " attempts: " + err.message);
      }
      
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// Enhanced function to fix common JSON issues
function fixCommonJsonIssues(jsonString) {
  let fixed = jsonString;
  
  // Fix the specific issue where summary field is missing its label
  // Look for patterns where a string appears after videoLecture without a field name
  fixed = fixed.replace(/("videoLecture":\s*"[^"]*",\s*)("(?:[^"\\]|\\.)*",)/g, '$1"summary": $2');
  
  // Fix missing closing brackets
  const openBraces = (fixed.match(/{/g) || []).length;
  const closeBraces = (fixed.match(/}/g) || []).length;
  if (openBraces > closeBraces) {
    const missing = openBraces - closeBraces;
    fixed += '}'.repeat(missing);
    console.log(`Fixed ${missing} missing closing brace(s)`);
  }
  
  // Fix missing closing square brackets
  const openBrackets = (fixed.match(/\[/g) || []).length;
  const closeBrackets = (fixed.match(/\]/g) || []).length;
  if (openBrackets > closeBrackets) {
    const missing = openBrackets - closeBrackets;
    fixed += ']'.repeat(missing);
    console.log(`Fixed ${missing} missing closing bracket(s)`);
  }
  
  // Remove trailing commas
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
  
  // Fix orphaned strings (strings without field names)
  // This is a more aggressive fix for the summary field issue
  fixed = fixed.replace(/,\s*"([^"]*)",\s*"quiz":/g, ', "summary": "$1", "quiz":');
  
  return fixed;
}

// Function to identify specific JSON issues
function identifyJsonIssues(jsonString) {
  console.log("Analyzing JSON structure...");
  
  // Check for common field issues
  const submodulePattern = /"submodules":\s*\[\s*{[^}]*}/g;
  const matches = jsonString.match(submodulePattern);
  
  if (matches) {
    matches.forEach((match, index) => {
      const hasName = match.includes('"name":');
      const hasDescription = match.includes('"description":');
      const hasVideoLecture = match.includes('"videoLecture":');
      const hasSummary = match.includes('"summary":');
      const hasQuiz = match.includes('"quiz":');
      
      console.log(`Submodule ${index + 1} fields:`, {
        name: hasName,
        description: hasDescription,
        videoLecture: hasVideoLecture,
        summary: hasSummary,
        quiz: hasQuiz
      });
      
      if (!hasSummary) {
        console.log(`Submodule ${index + 1} is missing "summary" field label!`);
      }
    });
  }
}

// Enhanced function to validate course structure
function validateCourseStructure(parsed, numModules) {
  if (!parsed.courseTitle || !parsed.overview || !parsed.audience || !parsed.modules || !parsed.capstoneProject) {
    throw new Error("Missing required top-level fields in generated JSON");
  }
  
  // Validate modules structure
  if (!Array.isArray(parsed.modules) || parsed.modules.length !== parseInt(numModules)) {
    throw new Error(`Expected exactly ${numModules} modules, got ${parsed.modules?.length || 0}`);
  }
  
  // Validate each module
  for (let i = 0; i < parsed.modules.length; i++) {
    const module = parsed.modules[i];
    if (!module.moduleName || !module.description || !module.submodules || !module.assignment) {
      throw new Error(`Module ${i + 1} is missing required fields: ${JSON.stringify(Object.keys(module))}`);
    }
    
    // Validate submodules
    if (!Array.isArray(module.submodules) || module.submodules.length === 0) {
      throw new Error(`Module ${i + 1} must have at least 1 submodule`);
    }
    
    for (let j = 0; j < module.submodules.length; j++) {
      const submodule = module.submodules[j];
      
      // Check for all required fields
      const requiredFields = ['name', 'description', 'videoLecture', 'summary', 'quiz'];
      const missingFields = requiredFields.filter(field => !submodule[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Module ${i + 1}, Submodule ${j + 1} is missing required fields: ${missingFields.join(', ')}`);
      }
      
      // Validate quiz
      if (!Array.isArray(submodule.quiz) || submodule.quiz.length !== 1) {
        throw new Error(`Module ${i + 1}, Submodule ${j + 1} must have exactly 1 quiz question`);
      }
      
      const quiz = submodule.quiz[0];
      if (!quiz.question || !quiz.options || !quiz.answer) {
        throw new Error(`Module ${i + 1}, Submodule ${j + 1} quiz is missing required fields`);
      }
      
      if (!Array.isArray(quiz.options) || quiz.options.length !== 4) {
        throw new Error(`Module ${i + 1}, Submodule ${j + 1} quiz must have exactly 4 options`);
      }
      
      if (!quiz.options.includes(quiz.answer)) {
        throw new Error(`Module ${i + 1}, Submodule ${j + 1} quiz answer must be one of the options`);
      }
    }
  }
  
  console.log("Course structure validation passed");
}