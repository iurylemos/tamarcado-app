import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type {
  BlockedPeriodRecord,
  ProfessionalRecord,
  WorkingHoursRecord,
} from '../interfaces/admin.interface';
import { AvailabilityPage } from './AvailabilityPage';
import { saveBlockedPeriod, saveWorkingHours } from '../services/admin.service';

vi.mock('../services/admin.service', () => ({
  saveWorkingHours: vi.fn(),
  saveBlockedPeriod: vi.fn(),
  deleteBlockedPeriod: vi.fn(),
  errorMessage: () => 'Falha ao salvar',
}));
const saveWorkingHoursMock = vi.mocked(saveWorkingHours);
const saveBlockedPeriodMock = vi.mocked(saveBlockedPeriod);

const professionals: ProfessionalRecord[] = [
  {
    id: 'ana',
    tenantId: 'tenant-aurora',
    name: 'Ana Souza',
    phoneE164: '+5511999990001',
    active: true,
  },
];
const hours: WorkingHoursRecord[] = [
  {
    id: 'ana-monday',
    tenantId: 'tenant-aurora',
    professionalId: 'ana',
    dayOfWeek: 1,
    startLocalTime: '09:00',
    endLocalTime: '18:00',
    active: true,
  },
];
const blocks: BlockedPeriodRecord[] = [
  {
    id: 'block-1',
    tenantId: 'tenant-aurora',
    professionalId: 'ana',
    startsAt: '2026-10-05T14:00:00.000Z',
    endsAt: '2026-10-05T15:00:00.000Z',
    reason: 'Demonstração',
  },
];

describe('AvailabilityPage', () => {
  it('renders weekly hours, timezone, and existing blocked periods', () => {
    render(
      <AvailabilityPage
        professionals={professionals}
        workingHours={hours}
        blockedPeriods={blocks}
        bookingIntervalMinutes={15}
        timezone="America/Sao_Paulo"
        onSaved={vi.fn(async () => undefined)}
      />,
    );

    expect(screen.getByText(/America\/Sao_Paulo/)).toBeInTheDocument();
    expect(screen.getByText(/09:00/)).toBeInTheDocument();
    expect(screen.getByText('Demonstração')).toBeInTheDocument();
    expect(screen.getByText(/15\s*minutos/)).toBeInTheDocument();
  });

  it('displays a rejected overlapping schedule clearly', async () => {
    saveWorkingHoursMock.mockRejectedValueOnce(new Error('schedule overlap'));
    render(
      <AvailabilityPage
        professionals={professionals}
        workingHours={hours}
        blockedPeriods={blocks}
        bookingIntervalMinutes={15}
        timezone="America/Sao_Paulo"
        onSaved={vi.fn(async () => undefined)}
      />,
    );
    fireEvent.change(screen.getByLabelText('Abre às'), { target: { value: '18:00' } });
    fireEvent.change(screen.getByLabelText('Fecha às'), { target: { value: '09:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar horário' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao salvar');
  });

  it('converts blocked business-local time into UTC before saving', async () => {
    saveBlockedPeriodMock.mockResolvedValueOnce({ id: 'new-block' });
    const onSaved = vi.fn(async () => undefined);
    render(
      <AvailabilityPage
        professionals={professionals}
        workingHours={hours}
        blockedPeriods={blocks}
        bookingIntervalMinutes={15}
        timezone="America/Sao_Paulo"
        onSaved={onSaved}
      />,
    );
    fireEvent.change(screen.getByLabelText('Início'), { target: { value: '2026-01-15T09:00' } });
    fireEvent.change(screen.getByLabelText('Fim'), { target: { value: '2026-01-15T10:00' } });
    fireEvent.change(screen.getByLabelText('Motivo (opcional)'), {
      target: { value: 'Teste de fuso' },
    });
    fireEvent.submit(screen.getByLabelText('Motivo (opcional)').closest('form')!);

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(saveBlockedPeriodMock).toHaveBeenCalledWith(
      expect.objectContaining({
        startsAt: '2026-01-15T12:00:00.000Z',
        endsAt: '2026-01-15T13:00:00.000Z',
        reason: 'Teste de fuso',
      }),
    );
  });
});
