// 📄 schema.js
import { z } from "zod";

const quizSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string()).length(4),
  answer: z.string().min(1),
});

const submoduleSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  videoLecture: z.string().min(1),
  summary: z.string().min(1),
  quiz: z.array(quizSchema).length(1),
});

const moduleSchema = z.object({
  moduleName: z.string().min(1),
  description: z.string().min(1),
  submodules: z.array(submoduleSchema).min(1).max(3),
  assignment: z.string().min(1),
});

export const getCourseSchema = (moduleCount) =>
  z.object({
    courseTitle: z.string().min(1),
    overview: z.string().min(1),
    audience: z.string().min(1),
    modules: z.array(moduleSchema).length(moduleCount),
    capstoneProject: z.object({
      title: z.string().min(1),
      description: z.string().min(1),
    }),
  });
