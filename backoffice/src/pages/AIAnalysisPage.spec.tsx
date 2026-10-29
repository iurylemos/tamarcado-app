import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AIAnalysisPage from './AIAnalysisPage';
import { getAnalysisReport, startAnalysis } from '../services/ai-analysis.service';

vi.mock('../services/ai-analysis.service', () => ({
  getAnalysisReport: vi.fn(),
  startAnalysis: vi.fn(),
  errorMessage: (error: unknown) => (error instanceof Error ? error.message : 'Falha.'),
}));

function fill(goal: string): void {
  fireEvent.change(screen.getByLabelText('Objetivo da análise'), { target: { value: goal } });
  fireEvent.change(screen.getByLabelText('Início do período'), { target: { value: '2030-02-01' } });
  fireEvent.change(screen.getByLabelText('Fim do período (não inclusivo)'), {
    target: { value: '2030-03-01' },
  });
}

describe('Backoffice AIAnalysisPage', () => {
  beforeEach(() => {
    vi.mocked(startAnalysis).mockReset();
    vi.mocked(getAnalysisReport).mockReset();
    vi.useRealTimers();
  });

  it('submits the request without any tenant and shows the queued state', async () => {
    vi.mocked(startAnalysis).mockResolvedValue({
      executionId: 'exec-1',
      status: 'queued',
      createdAt: '2030-02-01T12:00:00.000Z',
    });
    render(<AIAnalysisPage timezone="America/Sao_Paulo" />);
    fill('  Entender o desempenho de vendas  ');
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar análise' }));

    expect(await screen.findByText(/Na fila/)).toBeInTheDocument();
    const request = vi.mocked(startAnalysis).mock.calls[0]![0];
    expect(request).toEqual({
      idempotencyKey: expect.any(String),
      goal: 'Entender o desempenho de vendas',
      period: { start: '2030-02-01', endExclusive: '2030-03-01' },
    });
    expect(Object.keys(request)).not.toContain('tenantId');
  });

  it('validates the goal and period before calling the backend', async () => {
    render(<AIAnalysisPage timezone="America/Sao_Paulo" />);
    fill('curto');
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar análise' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('pelo menos 10 caracteres');

    fireEvent.change(screen.getByLabelText('Objetivo da análise'), {
      target: { value: 'Objetivo suficientemente longo' },
    });
    fireEvent.change(screen.getByLabelText('Fim do período (não inclusivo)'), {
      target: { value: '2030-01-01' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar análise' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('depois do início');
    expect(startAnalysis).not.toHaveBeenCalled();
  });

  it('shows a safe error and reuses the idempotency key when retrying the same input', async () => {
    vi.mocked(startAnalysis).mockRejectedValueOnce(
      new Error('Já existe uma análise em andamento.'),
    );
    vi.mocked(startAnalysis).mockResolvedValueOnce({
      executionId: 'exec-1',
      status: 'queued',
      createdAt: '2030-02-01T12:00:00.000Z',
    });
    render(<AIAnalysisPage timezone="America/Sao_Paulo" />);
    fill('Entender o desempenho de vendas');
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar análise' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe uma análise');

    fireEvent.click(screen.getByRole('button', { name: 'Solicitar análise' }));
    await waitFor(() => expect(startAnalysis).toHaveBeenCalledTimes(2));
    const [first, second] = vi.mocked(startAnalysis).mock.calls.map(([request]) => request);
    expect(second!.idempotencyKey).toBe(first!.idempotencyKey);
    expect(await screen.findByText(/Na fila/)).toBeInTheDocument();
  });

  it('displays the validated report, unavailable metrics, and navigable sources', async () => {
    vi.mocked(startAnalysis).mockResolvedValue({
      executionId: 'exec-report',
      status: 'queued',
      createdAt: '2030-02-01T12:00:00.000Z',
    });
    vi.mocked(getAnalysisReport).mockResolvedValue({
      status: 'succeeded',
      metrics: {
        coverage: 'sufficient',
        appointmentCount: 12,
        statusCounts: { pending: 1, confirmed: 2, cancelled: 3, completed: 6 },
        completedSalesCents: { available: true, value: 120000 },
        completedCommissionCents: { available: true, value: 15000 },
        occupancy: { available: false, limitation: 'Capacidade indisponível.' },
        periodComparison: { available: false, limitation: 'Comparação indisponível.' },
      },
      report: {
        summary: 'Resumo validado.',
        facts: [
          {
            id: 'fact-1',
            statement: 'Foram registrados 12 agendamentos.',
            source: { type: 'metric', reference: 'appointmentCount' },
          },
        ],
        inferences: [
          {
            id: 'inference-1',
            statement: 'Pode haver oportunidade.',
            evidenceReferences: ['fact-1'],
            uncertainty: 'A série histórica é insuficiente.',
          },
        ],
        recommendations: [],
        limitations: ['Sem capacidade cadastrada.'],
        sources: [
          {
            title: 'Panorama público',
            url: 'https://example.com/panorama',
            snippet: 'Resumo da fonte.',
          },
        ],
      },
    });

    render(<AIAnalysisPage timezone="America/Sao_Paulo" />);
    fill('Entender o desempenho de vendas');
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar análise' }));
    expect(startAnalysis).toHaveBeenCalledTimes(1);

    expect(await screen.findByText('Resumo validado.', {}, { timeout: 4500 })).toBeInTheDocument();
    expect(screen.getByText(/Indisponível — Capacidade indisponível/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Panorama público' })).toHaveAttribute(
      'href',
      'https://example.com/panorama',
    );
    vi.useRealTimers();
  });

  it('shows a safe error when the analysis provider refuses a request', async () => {
    vi.mocked(startAnalysis).mockResolvedValue({
      executionId: 'exec-limit',
      status: 'queued',
      createdAt: '2030-02-01T12:00:00.000Z',
    });
    vi.mocked(getAnalysisReport).mockResolvedValue({
      status: 'failed',
      failureCode: 'stage_unavailable',
    });

    render(<AIAnalysisPage timezone="America/Sao_Paulo" />);
    fill('Entender o desempenho de vendas');
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar análise' }));

    expect(await screen.findByRole('alert', {}, { timeout: 5000 })).toHaveTextContent(
      'A análise não pôde ser concluída.',
    );
    expect(screen.queryByText(/spending limit|OpenRouter/i)).not.toBeInTheDocument();
  });
});
