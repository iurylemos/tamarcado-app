import { z } from 'zod';
import { isValidDateString } from '../../../../shared/domain/timezone';

export const analysisLimits = {
  goalMinLength: 10,
  goalMaxLength: 500,
  maxPeriodDays: 366,
  minPeriodStart: '2000-01-01',
  idempotencyKeyPattern: /^[A-Za-z0-9_-]{16,128}$/,
} as const;

const dayMs = 86_400_000;

function toDay(value: string): number {
  return Date.parse(`${value}T00:00:00.000Z`);
}

const calendarDate = z
  .string()
  .refine((value) => isValidDateString(value) && value >= analysisLimits.minPeriodStart, {
    message: 'Data inválida.',
  });

const controlCharacters = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

const goal = z
  .string()
  .refine((value) => !controlCharacters.test(value), { message: 'Objetivo inválido.' })
  .transform((value) => value.replace(/\s+/g, ' ').trim())
  .pipe(z.string().min(analysisLimits.goalMinLength).max(analysisLimits.goalMaxLength));

// strict() rejects tenantId, uid, role, provider, tool and secret fields from the client.
export const startAnalysisInputSchema = z
  .object({
    idempotencyKey: z.string().regex(analysisLimits.idempotencyKeyPattern),
    goal,
    period: z
      .object({ start: calendarDate, endExclusive: calendarDate })
      .strict()
      .refine(({ start, endExclusive }) => toDay(endExclusive) > toDay(start), {
        message: 'O período deve terminar depois de começar.',
      })
      .refine(
        ({ start, endExclusive }) =>
          (toDay(endExclusive) - toDay(start)) / dayMs <= analysisLimits.maxPeriodDays,
        { message: 'O período excede o limite permitido.' },
      ),
  })
  .strict();

export type StartAnalysisInput = z.infer<typeof startAnalysisInputSchema>;
