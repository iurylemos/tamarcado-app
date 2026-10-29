import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateInsights } from './llm.provider';
import { AnalysisUtil } from '../utils/analysis.util';
import { LlmUtilProviderConfigurationError } from '../utils/llm.util';

const { agentConfig, generate, getOpenRouterApiKey } = vi.hoisted(() => ({
  agentConfig: vi.fn(),
  generate: vi.fn(),
  getOpenRouterApiKey: vi.fn(),
}));

vi.mock('@mastra/core/agent', () => ({
  Agent: class {
    constructor(config: unknown) {
      agentConfig(config);
    }

    generate(prompt: string, options: unknown) {
      return generate(prompt, options);
    }
  },
}));

vi.mock('../config/analysis.secrets', () => ({ getOpenRouterApiKey }));

const report = {
  schemaVersion: 1,
  period: { start: '2030-02-01', endExclusive: '2030-03-01' },
  summary: 'Resumo validado.',
  facts: [],
  inferences: [],
  recommendations: [],
  limitations: ['Dados limitados.'],
  sources: [],
};

const metrics = {
  schemaVersion: 1,
  period: { start: '2030-02-01', endExclusive: '2030-03-01', timezone: 'America/Sao_Paulo' },
  coverage: 'no_data' as const,
  appointmentCount: 0,
  statusCounts: { pending: 0, confirmed: 0, cancelled: 0, completed: 0 },
  completedSalesCents: { available: false as const, limitation: 'Sem dados.' },
  completedCommissionCents: { available: false as const, limitation: 'Sem dados.' },
  occupancy: { available: false as const, limitation: 'Indisponível.' },
  periodComparison: { available: false as const, limitation: 'Indisponível.' },
};

describe('LLM provider', () => {
  beforeEach(() => {
    agentConfig.mockReset();
    generate.mockReset();
    getOpenRouterApiKey.mockReset().mockReturnValue('test-secret');
  });

  it('does not call the model when its credential is missing', async () => {
    getOpenRouterApiKey.mockReturnValue('');

    await expect(
      generateInsights({
        goal: 'Analisar indicadores',
        metrics,
        sources: [],
        period: { start: '2030-02-01', endExclusive: '2030-03-01' },
      }),
    ).rejects.toBeInstanceOf(LlmUtilProviderConfigurationError);
    expect(generate).not.toHaveBeenCalled();
  });

  it('requests a strict structured report with the configured model and token cap', async () => {
    generate.mockResolvedValue({
      object: report,
      usage: { inputTokens: 123, outputTokens: 45, totalTokens: 168 },
    });

    const result = await generateInsights({
      goal: 'Analisar indicadores',
      metrics,
      sources: [],
      period: { start: '2030-02-01', endExclusive: '2030-03-01' },
    });

    expect(agentConfig).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'openrouter/openai/gpt-4o' }),
    );
    expect(agentConfig.mock.calls[0]?.[0]).not.toHaveProperty('tools');
    expect(generate).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        maxSteps: 1,
        toolChoice: 'none',
        modelSettings: expect.objectContaining({
          maxOutputTokens: AnalysisUtil.analysisRuntimeLimits.maxGeneratedTokens,
        }),
        structuredOutput: expect.objectContaining({
          schema: expect.anything(),
          errorStrategy: 'strict',
        }),
      }),
    );
    expect(result).toEqual({
      report,
      usage: { inputTokens: 123, outputTokens: 45, totalTokens: 168 },
    });
  });

  it('rejects invalid structured output rather than returning a report-shaped fallback', async () => {
    generate.mockResolvedValue({ object: { summary: 'incompleto' } });

    await expect(
      generateInsights({
        goal: 'Analisar indicadores',
        metrics,
        sources: [],
        period: { start: '2030-02-01', endExclusive: '2030-03-01' },
      }),
    ).rejects.toThrow();
  });

  it('keeps unavailable token usage as null instead of reporting zero', async () => {
    generate.mockResolvedValue({ object: report });

    await expect(
      generateInsights({
        goal: 'Analisar indicadores',
        metrics,
        sources: [],
        period: { start: '2030-02-01', endExclusive: '2030-03-01' },
      }),
    ).resolves.toMatchObject({
      usage: { inputTokens: null, outputTokens: null, totalTokens: null },
    });
  });
});
