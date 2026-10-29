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

const factsSourceSchema = z
  .array(
    z
      .object({
        id: z.string().regex(/^[a-z0-9-]{1,48}$/),
        statement: z.string().min(1).max(500),
        source: z.discriminatedUnion('type', [
          z
            .object({
              type: z.literal('metric'),
              reference: z.enum([
                'appointmentCount',
                'pendingAppointments',
                'confirmedAppointments',
                'cancelledAppointments',
                'completedAppointments',
                'completedSalesCents',
                'completedCommissionCents',
                'occupancy',
                'periodComparison',
              ]),
            })
            .strict(),
          z.object({ type: z.literal('web'), reference: httpUrl }).strict(),
        ]),
      })
      .strict(),
  )
  .max(20);

const inferencesSourceSchema = z
  .array(
    z
      .object({
        id: z.string().regex(/^[a-z0-9-]{1,48}$/),
        statement: z.string().min(1).max(500),
        evidenceReferences: z
          .array(z.string().regex(/^[a-z0-9-]{1,48}$/))
          .min(1)
          .max(10),
        uncertainty: z.string().min(1).max(300),
      })
      .strict(),
  )
  .max(20);

const recommendationsSourceSchema = z
  .array(
    z
      .object({
        id: z.string().regex(/^[a-z0-9-]{1,48}$/),
        title: z.string().min(1).max(160),
        rationale: z.string().min(1).max(500),
        priority: z.enum(['low', 'medium', 'high']),
        evidenceReferences: z
          .array(z.string().regex(/^[a-z0-9-]{1,48}$/))
          .min(1)
          .max(10),
      })
      .strict(),
  )
  .max(10);

export const reportSchema = z
  .object({
    schemaVersion: z.literal(analysisSchemaVersion),
    period: z.object({ start: z.string(), endExclusive: z.string() }).strict(),
    summary: z.string().min(1).max(2000),
    facts: factsSourceSchema,
    inferences: inferencesSourceSchema,
    recommendations: recommendationsSourceSchema,
    limitations: z.array(z.string().min(1).max(300)).max(20),
    sources: z.array(reportSourceSchema).max(3),
  })
  .strict();

export type AnalysisReport = z.infer<typeof reportSchema>;

export const reportRequestSchema = z.object({ executionId: z.string().min(1).max(128) }).strict();

export const reportSourcesSchema = z.array(reportSourceSchema).max(3);
