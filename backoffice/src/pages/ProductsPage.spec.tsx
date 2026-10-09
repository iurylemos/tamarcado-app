import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProductsPage from './ProductsPage';
import type { ProductRecord } from '../interfaces/admin.interface';
import { saveProduct } from '../services/admin.service';

vi.mock('../services/admin.service', () => ({
  saveProduct: vi.fn(),
  errorMessage: () => 'Falha ao salvar',
}));
const saveProductMock = vi.mocked(saveProduct);
const tenantId = 'tenant-aurora';

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
  beforeEach(() => vi.clearAllMocks());

  it('shows seeded product details and active states', () => {
    render(
      <ProductsPage
        tenantId={tenantId}
        products={products}
        onSaved={vi.fn(async () => undefined)}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Seus serviços' })).toBeInTheDocument();
    expect(screen.getByText(/120,00/)).toBeInTheDocument();
    expect(screen.getByText('35%')).toBeInTheDocument();
    expect(screen.getByText('Hidratação profunda')).toBeInTheDocument();
    expect(screen.getByText('Inativo')).toBeInTheDocument();
  });

  it('opens the editor for creating a product', () => {
    render(
      <ProductsPage tenantId={tenantId} products={[]} onSaved={vi.fn(async () => undefined)} />,
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Novo serviço' })[0]);
    expect(screen.getByRole('dialog', { name: 'Novo serviço' })).toBeInTheDocument();
    expect(screen.getByLabelText('Imagem legada ou imagem de referência (URL)')).not.toBeRequired();
  });

  it('shows server validation errors without closing the editor', async () => {
    saveProductMock.mockRejectedValueOnce(new Error('invalid product'));
    render(
      <ProductsPage tenantId={tenantId} products={[]} onSaved={vi.fn(async () => undefined)} />,
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Novo serviço' })[0]);
    fireEvent.change(screen.getByLabelText('Nome do serviço'), { target: { value: 'Massagem' } });
    fireEvent.change(screen.getByLabelText('Imagem legada ou imagem de referência (URL)'), {
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
    render(<ProductsPage tenantId={tenantId} products={[]} onSaved={onSaved} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Novo serviço' })[0]);
    fireEvent.change(screen.getByLabelText('Nome do serviço'), { target: { value: 'Massagem' } });
    fireEvent.change(screen.getByLabelText('Imagem legada ou imagem de referência (URL)'), {
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

  it('configures dynamic attributes, options, and a default option', async () => {
    saveProductMock.mockResolvedValueOnce({ id: 'new-service' });
    render(
      <ProductsPage tenantId={tenantId} products={[]} onSaved={vi.fn(async () => undefined)} />,
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Novo serviço' })[0]);
    fireEvent.change(screen.getByLabelText('Nome do serviço'), {
      target: { value: 'Coloração' },
    });
    fireEvent.change(screen.getByLabelText('Imagem legada ou imagem de referência (URL)'), {
      target: { value: 'https://images.example.test/coloracao.jpg' },
    });
    fireEvent.change(screen.getByLabelText('Preço (R$)'), { target: { value: '250' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar atributo' }));
    fireEvent.change(screen.getByLabelText('Nome do atributo'), {
      target: { value: 'Cor' },
    });
    const options = screen.getAllByLabelText('Opção');
    fireEvent.change(options[0], { target: { value: 'Castanho' } });
    fireEvent.change(options[1], { target: { value: 'Loiro' } });
    const defaultSelect = screen.getByLabelText('Opção padrão');
    const defaultOptionId = (defaultSelect as HTMLSelectElement).options[1]!.value;
    fireEvent.change(defaultSelect, { target: { value: defaultOptionId } });
    expect(
      screen
        .getAllByRole('button', { name: /Remover opção/ })
        .every((button) => button.hasAttribute('disabled')),
    ).toBe(true);

    fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);

    await waitFor(() => expect(saveProductMock).toHaveBeenCalled());
    expect(saveProductMock).toHaveBeenCalledWith(
      expect.objectContaining({
        description: '',
        customizationAttributes: [
          expect.objectContaining({
            label: 'Cor',
            defaultOptionId,
            options: [
              expect.objectContaining({ label: 'Castanho' }),
              expect.objectContaining({ label: 'Loiro' }),
            ],
          }),
        ],
      }),
    );
  });

  it('keeps description editing in the backoffice product form', async () => {
    saveProductMock.mockResolvedValueOnce({ id: products[0]!.id });
    render(
      <ProductsPage
        tenantId={tenantId}
        products={products}
        onSaved={vi.fn(async () => undefined)}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Editar Corte e finalização' }));
    expect(screen.getByLabelText('Descrição')).toHaveValue('Corte personalizado.');
    fireEvent.change(screen.getByLabelText('Descrição'), {
      target: { value: 'Descrição atualizada pelo backoffice.' },
    });
    fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);

    await waitFor(() =>
      expect(saveProductMock).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Descrição atualizada pelo backoffice.' }),
      ),
    );
  });
});
