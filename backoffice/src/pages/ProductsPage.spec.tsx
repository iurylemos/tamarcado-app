import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProductsPage } from './ProductsPage';
import type { ProductRecord } from '../interfaces/admin.interface';
import { saveProduct } from '../services/admin.service';

vi.mock('../services/admin.service', () => ({
  saveProduct: vi.fn(),
  errorMessage: () => 'Falha ao salvar',
}));
const saveProductMock = vi.mocked(saveProduct);

const products: ProductRecord[] = [
  {
    id: 'corte',
    tenantId: 'tenant-aurora',
    name: 'Corte e finalização',
    description: 'Corte personalizado.',
    imageUrl: 'https://images.example.test/corte.jpg',
    priceCents: 12000,
    durationMinutes: 60,
    commissionType: 'percentage',
    commissionValue: 3500,
    active: true,
  },
  {
    id: 'hidratacao',
    tenantId: 'tenant-aurora',
    name: 'Hidratação profunda',
    imageUrl: 'https://images.example.test/hidratacao.jpg',
    priceCents: 9500,
    durationMinutes: 45,
    commissionType: 'fixed',
    commissionValue: 2500,
    active: false,
  },
];

describe('ProductsPage', () => {
  it('shows seeded product details and active states', () => {
    render(<ProductsPage products={products} onSaved={vi.fn(async () => undefined)} />);

    expect(screen.getByRole('heading', { name: 'Seus serviços' })).toBeInTheDocument();
    expect(screen.getByText(/120,00/)).toBeInTheDocument();
    expect(screen.getByText('35%')).toBeInTheDocument();
    expect(screen.getByText('Hidratação profunda')).toBeInTheDocument();
    expect(screen.getByText('Inativo')).toBeInTheDocument();
  });

  it('opens the editor for creating a product', () => {
    render(<ProductsPage products={[]} onSaved={vi.fn(async () => undefined)} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Novo serviço' })[0]);
    expect(screen.getByRole('dialog', { name: 'Novo serviço' })).toBeInTheDocument();
    expect(screen.getByLabelText('Imagem do serviço (URL)')).toBeRequired();
  });

  it('shows server validation errors without closing the editor', async () => {
    saveProductMock.mockRejectedValueOnce(new Error('invalid product'));
    render(<ProductsPage products={[]} onSaved={vi.fn(async () => undefined)} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Novo serviço' })[0]);
    fireEvent.change(screen.getByLabelText('Nome do serviço'), { target: { value: 'Massagem' } });
    fireEvent.change(screen.getByLabelText('Imagem do serviço (URL)'), {
      target: { value: 'https://images.example.test/massagem.jpg' },
    });
    fireEvent.change(screen.getByLabelText('Preço (R$)'), { target: { value: '90' } });
    fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao salvar');
    expect(screen.getByRole('dialog', { name: 'Novo serviço' })).toBeInTheDocument();
  });

  it('closes the editor and refreshes the list after a successful save', async () => {
    const onSaved = vi.fn(async () => undefined);
    saveProductMock.mockResolvedValueOnce({ id: 'new-service' });
    render(<ProductsPage products={[]} onSaved={onSaved} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Novo serviço' })[0]);
    fireEvent.change(screen.getByLabelText('Nome do serviço'), { target: { value: 'Massagem' } });
    fireEvent.change(screen.getByLabelText('Imagem do serviço (URL)'), {
      target: { value: 'https://images.example.test/massagem.jpg' },
    });
    fireEvent.change(screen.getByLabelText('Preço (R$)'), { target: { value: '90' } });
    fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(saveProductMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Massagem',
        priceCents: 9000,
        durationMinutes: 30,
        commissionValue: 3500,
      }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
