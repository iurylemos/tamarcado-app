import { z } from 'zod';
import { analysisSchemaVersion } from '../../model/ai-analysis.model';

const httpUrl = z
  .string()
  .max(2048)
  .refine((value) => {
    try {
      return ['http:', 'https:'].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  });

export const reportSourceSchema = z
  .object({
    title: z.string().min(1).max(200),
    url: httpUrl,
    snippet: z.string().max(500),
  })
  .strict();

export const reportSchema = z
  .object({
    schemaVersion: z.literal(analysisSchemaVersion),
    summary: z.string().min(1).max(2000),
    findings: z.array(z.string().min(1).max(500)).max(20),
    limitations: z.array(z.string().min(1).max(300)).max(20),
    sources: z.array(reportSourceSchema).max(3),
  })
  .strict();

export type AnalysisReport = z.infer<typeof reportSchema>;
