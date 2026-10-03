import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type {
  AssignmentRecord,
  ProductRecord,
  ProfessionalRecord,
} from '../interfaces/admin.interface';
import ProfessionalsPage from './ProfessionalsPage';
import { saveProfessional } from '../services/admin.service';

vi.mock('../services/admin.service', () => ({
  saveProfessional: vi.fn(),
  errorMessage: () => 'Falha ao salvar',
}));
const saveProfessionalMock = vi.mocked(saveProfessional);

const professionals: ProfessionalRecord[] = [
  {
    id: 'ana',
    tenantId: 'tenant-aurora',
    name: 'Ana Souza',
    phoneE164: '+5511999990001',
    active: true,
  },
];
const products: ProductRecord[] = [
  {
    id: 'corte',
    tenantId: 'tenant-aurora',
    name: 'Corte e finalização',
    imageUrl: 'https://images.example.test/corte.jpg',
    priceCents: 12000,
    durationMinutes: 60,
    commissionType: 'percentage',
    commissionValue: 3500,
    active: true,
  },
];
const assignments: AssignmentRecord[] = [
  {
    id: 'ana-corte',
    tenantId: 'tenant-aurora',
    professionalId: 'ana',
    productId: 'corte',
    active: true,
  },
];

describe('ProfessionalsPage', () => {
  it('shows the seeded collaborator, Brazilian phone, and associated services', () => {
    render(
      <ProfessionalsPage
        professionals={professionals}
        products={products}
        assignments={assignments}
        onSaved={vi.fn(async () => undefined)}
      />,
    );

    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByText('+5511999990001')).toBeInTheDocument();
    expect(screen.getByText('Corte e finalização')).toBeInTheDocument();
    expect(screen.getByText('Ativo')).toBeInTheDocument();
  });

  it('shows phone validation errors from the trusted operation', async () => {
    saveProfessionalMock.mockRejectedValueOnce(new Error('invalid phone'));
    render(
      <ProfessionalsPage
        professionals={[]}
        products={products}
        assignments={[]}
        onSaved={vi.fn(async () => undefined)}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar pessoa' }));
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Novo perfil' } });
    fireEvent.change(screen.getByLabelText('Telefone com DDD'), {
      target: { value: '11999990000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar colaborador' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao salvar');
  });
});
