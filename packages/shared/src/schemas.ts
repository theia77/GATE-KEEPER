import { z } from "zod";

// Validation for custom mock uploads (CSV parsed to this shape, or raw JSON) — shared by
// the web <input> flow and the mobile expo-document-picker flow so both reject bad files
// identically before they ever hit Supabase Storage.

export const uploadedQuestionSchema = z.object({
  subject_code: z.string().min(1),
  prompt: z.string().min(1),
  option_a: z.string().min(1),
  option_b: z.string().min(1),
  option_c: z.string().min(1),
  option_d: z.string().min(1),
  correct_option: z.enum(["A", "B", "C", "D"]),
  marks: z.coerce.number().positive().default(1),
  negative_marks: z.coerce.number().min(0).default(0.33),
  explanation: z.string().optional(),
});

export const customMockUploadSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(500).optional(),
  duration_minutes: z.coerce.number().int().positive().max(300),
  questions: z.array(uploadedQuestionSchema).min(1).max(200),
});

export type UploadedQuestion = z.infer<typeof uploadedQuestionSchema>;
export type CustomMockUpload = z.infer<typeof customMockUploadSchema>;

export const noteUploadSchema = z.object({
  title: z.string().min(3).max(150),
  subject_code: z.string().optional(),
  visibility: z.enum(["public", "private"]).default("private"),
  content: z.string().max(20000).optional(),
});
