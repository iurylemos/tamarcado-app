import { logger } from 'firebase-functions';
import type { Request } from 'firebase-functions/v2/https';
import type { Response } from 'firebase-functions/v1';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderStorefront } from './render-storefront';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('renderStorefront diagnostics', () => {
  it('logs sanitized failure metadata and preserves the generic HTTP response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Fake Customer fake@example.test secret-token')),
    );
    const errorLog = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const response = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await renderStorefront({ hostname: 'storefront.test' } as Request, response);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.send).toHaveBeenCalledWith('Erro interno do servidor.');
    expect(errorLog).toHaveBeenCalledWith('operation.unexpected_failure', {
      functionName: 'renderStorefront',
      operation: 'storefront_render',
      stage: 'render',
      outcome: 'failure',
      errorCategory: 'unexpected',
    });
    expect(JSON.stringify(errorLog.mock.calls)).not.toMatch(
      /Fake Customer|fake@example\.test|secret-token/,
    );
  });
});
