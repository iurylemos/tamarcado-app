import { z } from 'zod';
import { analysisSchemaVersion } from '../../model/ai-analysis.model';

const cents = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const count = z.number().int().nonnegative();

function metric<T extends z.ZodType>(value: T) {
  return z.discriminatedUnion('available', [
    z.object({ available: z.literal(true), value }).strict(),
    z.object({ available: z.literal(false), limitation: z.string().min(1).max(300) }).strict(),
  ]);
}

export const aggregatedMetricsSchema = z
  .object({
    schemaVersion: z.literal(analysisSchemaVersion),
    period: z
      .object({ start: z.string(), endExclusive: z.string(), timezone: z.string().min(1) })
      .strict(),
    coverage: z.enum(['sufficient', 'no_data']),
    appointmentCount: count,
    statusCounts: z
      .object({ pending: count, confirmed: count, cancelled: count, completed: count })
      .strict(),
    completedSalesCents: metric(cents),
    completedCommissionCents: metric(cents),
    occupancy: metric(z.number()),
    periodComparison: metric(z.number()),
  })
  .strict();
