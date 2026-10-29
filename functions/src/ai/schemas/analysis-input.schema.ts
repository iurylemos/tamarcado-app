import { z } from 'zod';
import { isValidDateString } from '../../../../shared/domain/timezone';
import { AnalysisUtil } from '../utils/analysis.util';

const calendarDate = z
  .string()
  .refine((value) => isValidDateString(value) && value >= AnalysisUtil.limit.minPeriodStart, {
    message: 'Data inválida.',
  });

const goal = z
  .string()
  .refine((value) => !AnalysisUtil.controlCharacters.test(value), { message: 'Objetivo inválido.' })
  .transform((value) => value.replace(/\s+/g, ' ').trim())
  .pipe(z.string().min(AnalysisUtil.limit.goalMinLength).max(AnalysisUtil.limit.goalMaxLength));

// strict() rejects tenantId, uid, role, provider, tool and secret fields from the client.
export const startAnalysisInputSchema = z
  .object({
    idempotencyKey: z.string().regex(AnalysisUtil.limit.idempotencyKeyPattern),
    goal,
    period: z
      .object({ start: calendarDate, endExclusive: calendarDate })
      .strict()
      .refine(
        ({ start, endExclusive }) => AnalysisUtil.toDay(endExclusive) > AnalysisUtil.toDay(start),
        {
          message: 'O período deve terminar depois de começar.',
        },
      )
      .refine(
        ({ start, endExclusive }) =>
          (AnalysisUtil.toDay(endExclusive) - AnalysisUtil.toDay(start)) / AnalysisUtil.dayMs <=
          AnalysisUtil.limit.maxPeriodDays,
        { message: 'O período excede o limite permitido.' },
      ),
  })
  .strict();

export type StartAnalysisInput = z.infer<typeof startAnalysisInputSchema>;
