import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProductsPage from './ProductsPage';
import type { ProductRecord } from '../interfaces/product.interface';
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
    expect(screen.getByRole('heading', { name: 'Hidratação profunda' })).toBeInTheDocument();
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

  it('creates a product with an active promotion and its original price', async () => {
    saveProductMock.mockResolvedValueOnce({ id: 'new-service' });
    render(
      <ProductsPage tenantId={tenantId} products={[]} onSaved={vi.fn(async () => undefined)} />,
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Novo serviço' })[0]);
    fireEvent.change(screen.getByLabelText('Nome do serviço'), { target: { value: 'Massagem' } });
    fireEvent.change(screen.getByLabelText('Imagem legada ou imagem de referência (URL)'), {
      target: { value: 'https://images.example.test/massagem.jpg' },
    });
    fireEvent.change(screen.getByLabelText('Preço (R$)'), { target: { value: '90' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Ativar promoção' }));
    fireEvent.change(screen.getByLabelText('Preço promocional (R$)'), {
      target: { value: '70' },
    });
    fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);

    await waitFor(() =>
      expect(saveProductMock).toHaveBeenCalledWith(
        expect.objectContaining({
          priceCents: 9000,
          promotionActive: true,
          promotionalPriceCents: 7000,
        }),
      ),
    );
  });

  it('rejects a promotional price that is not lower than the original', async () => {
    render(
      <ProductsPage tenantId={tenantId} products={[]} onSaved={vi.fn(async () => undefined)} />,
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Novo serviço' })[0]);
    fireEvent.change(screen.getByLabelText('Nome do serviço'), { target: { value: 'Massagem' } });
    fireEvent.change(screen.getByLabelText('Imagem legada ou imagem de referência (URL)'), {
      target: { value: 'https://images.example.test/massagem.jpg' },
    });
    fireEvent.change(screen.getByLabelText('Preço (R$)'), { target: { value: '90' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Ativar promoção' }));
    fireEvent.change(screen.getByLabelText('Preço promocional (R$)'), {
      target: { value: '90' },
    });
    fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'O preço promocional deve ser menor que o preço original.',
    );
    expect(saveProductMock).not.toHaveBeenCalled();
  });

  it('deactivates an existing promotion without discarding its saved price', async () => {
    const promotedProduct: ProductRecord = {
      ...products[0]!,
      promotionActive: true,
      promotionalPriceCents: 8000,
    };
    saveProductMock.mockResolvedValueOnce({ id: promotedProduct.id });
    render(
      <ProductsPage
        tenantId={tenantId}
        products={[promotedProduct]}
        onSaved={vi.fn(async () => undefined)}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Editar Corte e finalização' }));
    expect(screen.getByRole('checkbox', { name: 'Ativar promoção' })).toBeChecked();
    expect(screen.getByLabelText('Preço promocional (R$)')).toHaveValue(80);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Ativar promoção' }));
    fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);

    await waitFor(() =>
      expect(saveProductMock).toHaveBeenCalledWith(
        expect.objectContaining({
          promotionActive: false,
          promotionalPriceCents: 8000,
        }),
      ),
    );
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

  it('materializes base-priced variants when enabling variant promotions', async () => {
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
    fireEvent.change(screen.getByLabelText('Nome do atributo'), { target: { value: 'Cor' } });
    const options = screen.getAllByLabelText('Opção');
    fireEvent.change(options[0], { target: { value: 'Castanho' } });
    fireEvent.change(options[1], { target: { value: 'Loiro' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Ativar promoção' }));
    fireEvent.change(screen.getByLabelText('Preço promocional da combinação Cor: Castanho (R$)'), {
      target: { value: '80' },
    });
    fireEvent.change(screen.getByLabelText('Preço promocional da combinação Cor: Loiro (R$)'), {
      target: { value: '85' },
    });
    fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);

    await waitFor(() =>
      expect(saveProductMock).toHaveBeenCalledWith(
        expect.objectContaining({
          promotionActive: true,
          variantPrices: [
            {
              selections: [{ attributeId: expect.any(String), optionId: expect.any(String) }],
              priceCents: 10000,
              promotionalPriceCents: 8000,
            },
            {
              selections: [{ attributeId: expect.any(String), optionId: expect.any(String) }],
              priceCents: 10000,
              promotionalPriceCents: 8500,
            },
          ],
        }),
      ),
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
    const priceByLabels = savedProduct.variantPrices!.map(
      (variantPrice: {
        selections: { attributeId: string; optionId: string }[];
        priceCents: number;
      }) => [
        variantPrice.selections
          .map(
            (selection: { attributeId: string; optionId: string }) =>
              attributes
                .find(
                  (attribute: { id: string; options: { id: string; label: string }[] }) =>
                    attribute.id === selection.attributeId,
                )!
                .options.find(
                  (option: { id: string; label: string }) => option.id === selection.optionId,
                )!.label,
          )
          .join('+'),
        variantPrice.priceCents,
      ],
    );
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

  it('configures a positive estimated delivery period for a product without variants', async () => {
    saveProductMock.mockResolvedValueOnce({ id: 'estimated-service' });
    render(
      <ProductsPage tenantId={tenantId} products={[]} onSaved={vi.fn(async () => undefined)} />,
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Novo serviço' })[0]);
    fireEvent.change(screen.getByLabelText('Nome do serviço'), {
      target: { value: 'Serviço com prazo' },
    });
    fireEvent.change(screen.getByLabelText('Imagem legada ou imagem de referência (URL)'), {
      target: { value: 'https://images.example.test/prazo.jpg' },
    });
    fireEvent.change(screen.getByLabelText('Preço (R$)'), { target: { value: '90' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Ativar prazo estimado' }));
    fireEvent.change(screen.getByLabelText('Prazo estimado (dias corridos)'), {
      target: { value: '15' },
    });
    fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);

    await waitFor(() =>
      expect(saveProductMock).toHaveBeenCalledWith(
        expect.objectContaining({
          estimatedDeliveryEnabled: true,
          estimatedDeliveryDays: 15,
        }),
      ),
    );
  });

  it.each(['', '0', '-1', '1.5'])(
    'rejects invalid estimated delivery period %s for a simple product',
    async (days) => {
      render(
        <ProductsPage tenantId={tenantId} products={[]} onSaved={vi.fn(async () => undefined)} />,
      );
      fireEvent.click(screen.getAllByRole('button', { name: 'Novo serviço' })[0]);
      fireEvent.change(screen.getByLabelText('Nome do serviço'), {
        target: { value: 'Serviço com prazo' },
      });
      fireEvent.change(screen.getByLabelText('Imagem legada ou imagem de referência (URL)'), {
        target: { value: 'https://images.example.test/prazo.jpg' },
      });
      fireEvent.change(screen.getByLabelText('Preço (R$)'), { target: { value: '90' } });
      fireEvent.click(screen.getByRole('checkbox', { name: 'Ativar prazo estimado' }));
      if (days) {
        fireEvent.change(screen.getByLabelText('Prazo estimado (dias corridos)'), {
          target: { value: days },
        });
      }
      fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Informe um prazo estimado inteiro maior que zero.',
      );
      expect(saveProductMock).not.toHaveBeenCalled();
    },
  );

  it('stores estimated delivery days for every customization combination', async () => {
    saveProductMock.mockResolvedValueOnce({ id: 'variant-service' });
    render(
      <ProductsPage tenantId={tenantId} products={[]} onSaved={vi.fn(async () => undefined)} />,
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Novo serviço' })[0]);
    fireEvent.change(screen.getByLabelText('Nome do serviço'), {
      target: { value: 'Produto personalizado' },
    });
    fireEvent.change(screen.getByLabelText('Imagem legada ou imagem de referência (URL)'), {
      target: { value: 'https://images.example.test/variacao.jpg' },
    });
    fireEvent.change(screen.getByLabelText('Preço (R$)'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar atributo' }));
    fireEvent.change(screen.getByLabelText('Nome do atributo'), { target: { value: 'Cor' } });
    const options = screen.getAllByLabelText('Opção');
    fireEvent.change(options[0], { target: { value: 'Castanho' } });
    fireEvent.change(options[1], { target: { value: 'Loiro' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Ativar prazo estimado' }));
    fireEvent.change(screen.getByLabelText('Característica que define o prazo'), {
      target: { value: screen.getByRole('option', { name: 'Cor' }).getAttribute('value') },
    });
    fireEvent.change(screen.getByLabelText('Cor: Castanho (dias)'), {
      target: { value: '7' },
    });
    fireEvent.change(screen.getByLabelText('Cor: Loiro (dias)'), {
      target: { value: '15' },
    });
    fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);

    await waitFor(() =>
      expect(saveProductMock).toHaveBeenCalledWith(
        expect.objectContaining({
          estimatedDeliveryEnabled: true,
          variantPrices: [
            {
              selections: [{ attributeId: expect.any(String), optionId: expect.any(String) }],
              priceCents: 10000,
              estimatedDeliveryDays: 7,
            },
            {
              selections: [{ attributeId: expect.any(String), optionId: expect.any(String) }],
              priceCents: 10000,
              estimatedDeliveryDays: 15,
            },
          ],
        }),
      ),
    );
  });

  it('rejects an incomplete estimated delivery configuration for variants', async () => {
    render(
      <ProductsPage tenantId={tenantId} products={[]} onSaved={vi.fn(async () => undefined)} />,
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Novo serviço' })[0]);
    fireEvent.change(screen.getByLabelText('Nome do serviço'), {
      target: { value: 'Produto personalizado' },
    });
    fireEvent.change(screen.getByLabelText('Imagem legada ou imagem de referência (URL)'), {
      target: { value: 'https://images.example.test/variacao.jpg' },
    });
    fireEvent.change(screen.getByLabelText('Preço (R$)'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar atributo' }));
    fireEvent.change(screen.getByLabelText('Nome do atributo'), { target: { value: 'Cor' } });
    const options = screen.getAllByLabelText('Opção');
    fireEvent.change(options[0], { target: { value: 'Castanho' } });
    fireEvent.change(options[1], { target: { value: 'Loiro' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Ativar prazo estimado' }));
    fireEvent.change(screen.getByLabelText('Característica que define o prazo'), {
      target: { value: screen.getByRole('option', { name: 'Cor' }).getAttribute('value') },
    });
    fireEvent.change(screen.getByLabelText('Cor: Castanho (dias)'), {
      target: { value: '7' },
    });
    fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Informe um prazo estimado inteiro maior que zero para cada combinação.',
    );
    expect(saveProductMock).not.toHaveBeenCalled();
  });

  it('preserves conflicting legacy deadlines when saving unrelated edits', async () => {
    const product = sofaProduct();
    saveProductMock.mockResolvedValueOnce({ id: product.id });
    render(
      <ProductsPage
        tenantId={tenantId}
        products={[product]}
        onSaved={vi.fn(async () => undefined)}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Editar Sofá' }));
    fireEvent.change(screen.getByLabelText('Característica que define o prazo'), {
      target: { value: 'size' },
    });
    expect(
      screen.getByText('Conflito: as combinações possuem prazos diferentes.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Lugares: 2 lugares / Tecido: Linho: 15 dias')).toBeInTheDocument();
    expect(screen.getByText('Lugares: 2 lugares / Tecido: Couro: 17 dias')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Atualizado' } });
    fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);
    await waitFor(() => expect(saveProductMock).toHaveBeenCalledOnce());
    expect(saveProductMock.mock.calls[0]![0].variantPrices).toEqual(product.variantPrices);
  });

  it('requires explicit confirmation before applying a deadline to conflicting variants', async () => {
    const product = sofaProduct();
    saveProductMock.mockResolvedValueOnce({ id: product.id });
    render(
      <ProductsPage
        tenantId={tenantId}
        products={[product]}
        onSaved={vi.fn(async () => undefined)}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Editar Sofá' }));
    fireEvent.change(screen.getByLabelText('Característica que define o prazo'), {
      target: { value: 'size' },
    });
    fireEvent.change(screen.getByLabelText('Lugares: 2 lugares (dias)'), {
      target: { value: '15' },
    });
    fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Confirme a substituição');
    expect(saveProductMock).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirmar prazo único para Lugares: 2 lugares' }),
    );
    fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);
    await waitFor(() => expect(saveProductMock).toHaveBeenCalledOnce());
    const saved = saveProductMock.mock.calls[0]![0].variantPrices!;
    expect(saved.map((variant) => variant.estimatedDeliveryDays)).toEqual([15, 15, 20, 20]);
    expect(saved.map((variant) => variant.priceCents)).toEqual([10000, 11000, 12000, 13000]);
    expect(saved.map((variant) => variant.promotionalPriceCents)).toEqual([
      9000, 10000, 11000, 12000,
    ]);
  });

  it('updates all secondary variants of a characteristic without modifying other groups', async () => {
    const product = sofaProduct();
    saveProductMock.mockResolvedValueOnce({ id: product.id });
    render(
      <ProductsPage
        tenantId={tenantId}
        products={[product]}
        onSaved={vi.fn(async () => undefined)}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Editar Sofá' }));
    fireEvent.change(screen.getByLabelText('Característica que define o prazo'), {
      target: { value: 'size' },
    });
    fireEvent.change(screen.getByLabelText('Lugares: 3 lugares (dias)'), {
      target: { value: '22' },
    });
    fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);
    await waitFor(() => expect(saveProductMock).toHaveBeenCalledOnce());
    const saved = saveProductMock.mock.calls[0]![0].variantPrices!;
    expect(saved.map((variant) => variant.estimatedDeliveryDays)).toEqual([15, 17, 22, 22]);
    expect(saved.map((variant) => variant.priceCents)).toEqual([10000, 11000, 12000, 13000]);
  });

  it('applies a general deadline to all variants and displays the inherited value', async () => {
    const product = sofaProduct();
    product.variantPrices = product.variantPrices!.map((variant) => ({
      ...variant,
      estimatedDeliveryDays: 15,
    }));
    saveProductMock.mockResolvedValueOnce({ id: product.id });
    render(
      <ProductsPage
        tenantId={tenantId}
        products={[product]}
        onSaved={vi.fn(async () => undefined)}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Editar Sofá' }));
    expect(
      screen.getByText('As 4 combinações herdam o prazo geral nesta edição.'),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Prazo geral (dias)'), {
      target: { value: '12' },
    });
    fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);
    await waitFor(() => expect(saveProductMock).toHaveBeenCalledOnce());
    expect(
      saveProductMock.mock.calls[0]![0].variantPrices!.map(
        (variant) => variant.estimatedDeliveryDays,
      ),
    ).toEqual([12, 12, 12, 12]);
  });

  it('simulates quantities without writing and reports missing deadlines', () => {
    const sofa = sofaProduct();
    const chair: ProductRecord = {
      ...products[0]!,
      id: 'chair',
      name: 'Poltrona',
      estimatedDeliveryEnabled: true,
      estimatedDeliveryDays: 3,
    };
    const missing: ProductRecord = { ...products[1]!, id: 'missing', name: 'Sem prazo' };
    render(
      <ProductsPage
        tenantId={tenantId}
        products={[sofa, chair, missing]}
        onSaved={vi.fn(async () => undefined)}
      />,
    );
    fireEvent.click(screen.getByText('Simular prazo estimado'));
    fireEvent.change(screen.getByLabelText('Quantidade de Sofá'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Sofá — Lugares'), { target: { value: 'three' } });
    fireEvent.change(screen.getByLabelText('Quantidade de Poltrona'), { target: { value: '2' } });
    expect(screen.getByText('Prazo estimado da simulação: 26 dias')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Sofá — Lugares'), { target: { value: 'two' } });
    expect(screen.getByText('Prazo estimado da simulação: 21 dias')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Quantidade de Sem prazo'), { target: { value: '1' } });
    expect(
      screen.getByText('Configure os prazos ausentes antes de calcular o total.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Prazo estimado da simulação:/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Quantidade de Sem prazo'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('Quantidade de Poltrona'), { target: { value: '1.5' } });
    expect(
      screen.getByText('Corrija as quantidades para calcular a simulação.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Prazo estimado da simulação:/)).not.toBeInTheDocument();
    expect(saveProductMock).not.toHaveBeenCalled();
  });

  it('does not simulate a product when another variant has no configured deadline', () => {
    const product = sofaProduct();
    product.variantPrices = product.variantPrices!.map((variant, index) =>
      index === 3 ? { ...variant, estimatedDeliveryDays: undefined } : variant,
    );
    render(
      <ProductsPage
        tenantId={tenantId}
        products={[product]}
        onSaved={vi.fn(async () => undefined)}
      />,
    );
    fireEvent.click(screen.getByText('Simular prazo estimado'));
    fireEvent.change(screen.getByLabelText('Quantidade de Sofá'), { target: { value: '1' } });
    expect(
      screen.getByText('Configure os prazos ausentes antes de calcular o total.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Prazo estimado da simulação:/)).not.toBeInTheDocument();
  });
});

function sofaProduct(): ProductRecord {
  const attributes = [
    {
      id: 'size',
      label: 'Lugares',
      defaultOptionId: 'two',
      options: [
        { id: 'two', label: '2 lugares' },
        { id: 'three', label: '3 lugares' },
      ],
    },
    {
      id: 'fabric',
      label: 'Tecido',
      defaultOptionId: 'linen',
      options: [
        { id: 'linen', label: 'Linho' },
        { id: 'leather', label: 'Couro' },
      ],
    },
  ];
  return {
    ...products[0]!,
    id: 'sofa',
    name: 'Sofá',
    promotionActive: true,
    estimatedDeliveryEnabled: true,
    customizationAttributes: attributes,
    variantPrices: [
      {
        selections: [
          { attributeId: 'size', optionId: 'two' },
          { attributeId: 'fabric', optionId: 'linen' },
        ],
        priceCents: 10000,
        promotionalPriceCents: 9000,
        estimatedDeliveryDays: 15,
      },
      {
        selections: [
          { attributeId: 'size', optionId: 'two' },
          { attributeId: 'fabric', optionId: 'leather' },
        ],
        priceCents: 11000,
        promotionalPriceCents: 10000,
        estimatedDeliveryDays: 17,
      },
      {
        selections: [
          { attributeId: 'size', optionId: 'three' },
          { attributeId: 'fabric', optionId: 'linen' },
        ],
        priceCents: 12000,
        promotionalPriceCents: 11000,
        estimatedDeliveryDays: 20,
      },
      {
        selections: [
          { attributeId: 'size', optionId: 'three' },
          { attributeId: 'fabric', optionId: 'leather' },
        ],
        priceCents: 13000,
        promotionalPriceCents: 12000,
        estimatedDeliveryDays: 20,
      },
    ],
  };
}
