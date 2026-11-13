import { useMemo, useState, type JSX } from 'react';
import type { ProductCustomizationSelection } from '@shared/interfaces/product.interface';
import type { ProductRecord } from '../../../interfaces/product.interface';
import { DeliveryUtil } from '../../../utils/delivery.util';

type Props = { products: ProductRecord[] };

export default function EstimatedDeliverySimulator({ products }: Readonly<Props>): JSX.Element {
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [choices, setChoices] = useState<Record<string, ProductCustomizationSelection[]>>({});

  const rows = useMemo(
    () =>
      products.map((product) => {
        const attributes = product.customizationAttributes ?? [];

        const selections = attributes.map((attribute) => ({
          attributeId: attribute.id,
          optionId:
            choices[product.id]?.find((selection) => selection.attributeId === attribute.id)
              ?.optionId ?? attribute.defaultOptionId,
        }));

        const rawQuantity = quantities[product.id] ?? '0';

        const quantity = Number(rawQuantity);

        const validQuantity =
          rawQuantity.trim() !== '' && Number.isSafeInteger(quantity) && quantity >= 0;

        const days = DeliveryUtil.hasCompleteEstimatedDelivery(product)
          ? DeliveryUtil.resolveEstimatedDeliveryDays(product, selections)
          : undefined;

        return { product, attributes, selections, rawQuantity, quantity, validQuantity, days };
      }),
    [products, quantities, choices],
  );

  const { selected, invalidQuantity, missingDays, total, validTotal } = useMemo(() => {
    const selected = rows.filter((row) => row.validQuantity && row.quantity > 0);
    const invalidQuantity = rows.some((row) => !row.validQuantity);
    const missingDays = selected.some((row) => row.days === undefined);
    const total = selected.reduce((sum, row) => sum + (row.days ?? 0) * row.quantity, 0);
    const validTotal = Number.isSafeInteger(total);

    return { selected, invalidQuantity, missingDays, total, validTotal };
  }, [rows]);

  return (
    <section className="form-stack" aria-labelledby="estimate-simulator-heading">
      <h2 id="estimate-simulator-heading">Simulador de prazo estimado</h2>
      <p className="muted">
        Simulação apenas para o backoffice. Não altera serviços nem o cálculo do agendamento.
      </p>
      {rows.map(
        ({ product, attributes, selections, rawQuantity, quantity, validQuantity, days }) => (
          <fieldset className="form-stack" key={product.id}>
            <legend>{product.name}</legend>
            <label>
              Quantidade de {product.name}
              <input
                type="number"
                min="0"
                step="1"
                value={rawQuantity}
                onChange={(event) =>
                  setQuantities((current) => ({ ...current, [product.id]: event.target.value }))
                }
              />
            </label>
            {quantity > 0 &&
              attributes.map((attribute) => (
                <label key={attribute.id}>
                  {product.name} — {attribute.label}
                  <select
                    value={
                      selections.find((selection) => selection.attributeId === attribute.id)
                        ?.optionId
                    }
                    onChange={(event) =>
                      setChoices((current) => ({
                        ...current,
                        [product.id]: [
                          ...selections.filter(
                            (selection) => selection.attributeId !== attribute.id,
                          ),
                          { attributeId: attribute.id, optionId: event.target.value },
                        ],
                      }))
                    }
                  >
                    {attribute.options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            {!validQuantity ? (
              <p>Informe uma quantidade inteira maior ou igual a zero.</p>
            ) : quantity > 0 ? (
              <p>
                {days === undefined
                  ? 'Prazo não configurado para esta seleção.'
                  : `${days} dias por unidade.`}
              </p>
            ) : null}
          </fieldset>
        ),
      )}
      <div aria-live="polite">
        {invalidQuantity ? (
          <p>Corrija as quantidades para calcular a simulação.</p>
        ) : selected.length === 0 ? (
          <p>Selecione ao menos uma unidade para simular.</p>
        ) : missingDays ? (
          <p>Configure os prazos ausentes antes de calcular o total.</p>
        ) : !validTotal ? (
          <p>O total excede o limite permitido para a simulação.</p>
        ) : (
          <strong>Prazo estimado da simulação: {total} dias</strong>
        )}
      </div>
    </section>
  );
}
