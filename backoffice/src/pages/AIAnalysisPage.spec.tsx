import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AIAnalysisPage from './AIAnalysisPage';
import { startAnalysis } from '../services/ai-analysis.service';

vi.mock('../services/ai-analysis.service', () => ({
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

    expect(await screen.findByRole('status')).toHaveTextContent('Na fila');
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
    expect(await screen.findByRole('status')).toHaveTextContent('Na fila');
  });
});
