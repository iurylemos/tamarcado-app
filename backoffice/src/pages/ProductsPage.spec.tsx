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

  it('saves an independent price for each complete customization combination', async () => {
    saveProductMock.mockResolvedValueOnce({ id: 'new-service' });
    render(
      <ProductsPage tenantId={tenantId} products={[]} onSaved={vi.fn(async () => undefined)} />,
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Novo serviço' })[0]);
    fireEvent.change(screen.getByLabelText('Nome do serviço'), {
      target: { value: 'Produto personalizado' },
    });
    fireEvent.change(screen.getByLabelText('Imagem legada ou imagem de referência (URL)'), {
      target: { value: 'https://images.example.test/produto.jpg' },
    });
    fireEvent.change(screen.getByLabelText('Preço (R$)'), { target: { value: '100' } });

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar atributo' }));
    const attributeNames = screen.getAllByLabelText('Nome do atributo');
    fireEvent.change(attributeNames[0], { target: { value: 'Cor' } });
    const firstAttributeOptions = screen.getAllByLabelText('Opção');
    fireEvent.change(firstAttributeOptions[0], { target: { value: 'Castanho' } });
    fireEvent.change(firstAttributeOptions[1], { target: { value: 'Loiro' } });

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar atributo' }));
    const updatedAttributeNames = screen.getAllByLabelText('Nome do atributo');
    fireEvent.change(updatedAttributeNames[1], { target: { value: 'Tecido' } });
    const allOptions = screen.getAllByLabelText('Opção');
    fireEvent.change(allOptions[2], { target: { value: 'Linho' } });
    fireEvent.change(allOptions[3], { target: { value: 'Veludo' } });

    fireEvent.click(screen.getByRole('checkbox', { name: /Preço varia conforme as opções/ }));
    const comboPrices = [
      ['Preço da combinação Cor: Castanho / Tecido: Linho (R$)', '110'],
      ['Preço da combinação Cor: Castanho / Tecido: Veludo (R$)', '120'],
      ['Preço da combinação Cor: Loiro / Tecido: Linho (R$)', '130'],
      ['Preço da combinação Cor: Loiro / Tecido: Veludo (R$)', '140'],
    ] as const;
    comboPrices.forEach(([label, value]) =>
      fireEvent.change(screen.getByLabelText(label), { target: { value } }),
    );
    fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);

    await waitFor(() => expect(saveProductMock).toHaveBeenCalledOnce());
    const savedProduct = saveProductMock.mock.calls[0]![0];
    const attributes = savedProduct.customizationAttributes!;
    const priceByLabels = savedProduct.variantPrices!.map((variantPrice) => [
      variantPrice.selections
        .map(
          (selection) =>
            attributes
              .find((attribute) => attribute.id === selection.attributeId)!
              .options.find((option) => option.id === selection.optionId)!.label,
        )
        .join('+'),
      variantPrice.priceCents,
    ]);
    expect(priceByLabels).toEqual([
      ['Castanho+Linho', 11000],
      ['Castanho+Veludo', 12000],
      ['Loiro+Linho', 13000],
      ['Loiro+Veludo', 14000],
    ]);
  });

  it('loads existing variant prices for editing and keeps them on save', async () => {
    const variantProduct: ProductRecord = {
      ...products[0]!,
      name: 'Produto personalizado',
      customizationAttributes: [
        {
          id: 'color',
          label: 'Cor',
          options: [
            { id: 'brown', label: 'Castanho' },
            { id: 'blonde', label: 'Loiro' },
          ],
          defaultOptionId: 'brown',
        },
      ],
      variantPrices: [
        {
          selections: [{ attributeId: 'color', optionId: 'brown' }],
          priceCents: 10000,
        },
        {
          selections: [{ attributeId: 'color', optionId: 'blonde' }],
          priceCents: 12000,
        },
      ],
    };
    saveProductMock.mockResolvedValueOnce({ id: variantProduct.id });
    render(
      <ProductsPage
        tenantId={tenantId}
        products={[variantProduct]}
        onSaved={vi.fn(async () => undefined)}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Editar Produto personalizado' }));
    expect(screen.getByLabelText('Preço da combinação Cor: Castanho (R$)')).toHaveValue(100);
    expect(screen.getByLabelText('Preço da combinação Cor: Loiro (R$)')).toHaveValue(120);
    fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);

    await waitFor(() =>
      expect(saveProductMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variantPrices: [
            {
              selections: [{ attributeId: 'color', optionId: 'brown' }],
              priceCents: 10000,
            },
            {
              selections: [{ attributeId: 'color', optionId: 'blonde' }],
              priceCents: 12000,
            },
          ],
        }),
      ),
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
