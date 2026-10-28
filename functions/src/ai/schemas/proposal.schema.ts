import { z } from 'zod';
import { analysisSchemaVersion } from '../../model/ai-analysis.model';

// The action allowlist is intentionally empty until a story defines approved actions;
// no payload validates, so no proposal can be created and no executor exists.
export const proposalActionAllowlist = [] as const;

export const proposalPayloadSchema = z
  .object({
    schemaVersion: z.literal(analysisSchemaVersion),
    action: z.never(),
    justification: z.string().min(1).max(1000),
    parameters: z.record(z.string(), z.unknown()),
  })
  .strict();
