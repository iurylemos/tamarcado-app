import { useMemo, useState, type JSX } from 'react';
import type {
  ProductCustomizationAttribute,
  ProductCustomizationSelection,
} from '@shared/interfaces/product.interface';
import type { DeliveryGroup } from '../../../interfaces/delivery.interface';
import { productCustomizationCombinationKey } from '@shared/product-variant-price';
import { DeliveryUtil } from '../../../utils/delivery.util';

type Props = {
  attributes: ProductCustomizationAttribute[];
  combinations: ProductCustomizationSelection[][];
  drafts: Record<string, string>;
  onChange: (drafts: Record<string, string>) => void;
  pending: Record<string, string>;
  onPendingChange: (pending: Record<string, string>) => void;
};

export default function EstimatedDeliveryGroups({
  attributes,
  combinations,
  drafts,
  onChange,
  pending,
  onPendingChange,
}: Readonly<Props>): JSX.Element {
  const [grouping, setGrouping] = useState<string>(() =>
    DeliveryUtil.inferEstimateGrouping(attributes, drafts),
  );

  const attribute = useMemo<ProductCustomizationAttribute | undefined>(
    () => attributes.find((item) => item.id === grouping),
    [attributes, grouping],
  );

  const currentGrouping = useMemo<string>(
    () => (grouping === DeliveryUtil.generalEstimateKey || attribute ? grouping : ''),
    [grouping, attribute],
  );

  const groups = useMemo<DeliveryGroup[]>(() => {
    const defaultGroup = {
      id: DeliveryUtil.generalEstimateKey,
      label: 'Prazo geral',
      combinations,
    };

    if (currentGrouping === DeliveryUtil.generalEstimateKey) {
      return [defaultGroup];
    }

    if (attribute) {
      return attribute.options.map((option) => ({
        id: option.id,
        label: `${attribute.label || 'Característica'}: ${option.label || 'Opção'}`,
        combinations: combinations.filter((selections) =>
          selections.some(
            (selection) =>
              selection.attributeId === attribute.id && selection.optionId === option.id,
          ),
        ),
      }));
    }

    return [];
  }, [currentGrouping, attribute, combinations]);

  return (
    <div className="form-stack">
      <label>
        Característica que define o prazo
        <select
          value={currentGrouping}
          onChange={(event) => {
            setGrouping(event.target.value);
            onPendingChange({});
          }}
        >
          <option value="">Selecione uma característica</option>
          <option value={DeliveryUtil.generalEstimateKey}>Prazo geral para todas as opções</option>
          {attributes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label || 'Atributo sem nome'}
            </option>
          ))}
        </select>
      </label>
      <p className="muted">
        O prazo de cada grupo é aplicado às demais opções. A característica escolhida não é salva
        separadamente.
      </p>
      {groups.map((group) => {
        const keys = group.combinations.map(productCustomizationCombinationKey);
        const values = keys.map((key) => drafts[key] ?? '');
        const conflict = new Set(values).size > 1;
        const pendingKey = `${currentGrouping}:${group.id}`;
        const value = conflict ? (pending[pendingKey] ?? '') : (values[0] ?? '');
        const apply = (nextValue: string): void => {
          onChange({ ...drafts, ...Object.fromEntries(keys.map((key) => [key, nextValue])) });
        };
        return (
          <div className="form-stack" key={pendingKey}>
            <label>
              {group.label} (dias)
              <input
                type="number"
                min="1"
                step="1"
                value={value}
                onChange={(event) => {
                  if (conflict) {
                    onPendingChange({ ...pending, [pendingKey]: event.target.value });
                  } else {
                    apply(event.target.value);
                  }
                }}
              />
            </label>
            {conflict ? (
              <>
                <strong>Conflito: as combinações possuem prazos diferentes.</strong>
                <ul>
                  {group.combinations.map((selections) => {
                    const key = productCustomizationCombinationKey(selections);
                    const label = selections
                      .map((selection) => {
                        const selectedAttribute = attributes.find(
                          (item) => item.id === selection.attributeId,
                        );
                        const option = selectedAttribute?.options.find(
                          (item) => item.id === selection.optionId,
                        );
                        return `${selectedAttribute?.label || 'Atributo'}: ${option?.label || 'Opção'}`;
                      })
                      .join(' / ');
                    return (
                      <li key={key}>
                        {label}: {drafts[key] ? `${drafts[key]} dias` : 'sem prazo'}
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  className="button secondary"
                  disabled={!Number.isSafeInteger(Number(value)) || Number(value) < 1}
                  onClick={() => {
                    apply(value);
                    const nextPending = { ...pending };
                    delete nextPending[pendingKey];
                    onPendingChange(nextPending);
                  }}
                >
                  Confirmar prazo único para {group.label}
                </button>
              </>
            ) : value ? (
              <small>
                {currentGrouping === DeliveryUtil.generalEstimateKey
                  ? `As ${keys.length} combinações herdam o prazo geral nesta edição.`
                  : `Prazo aplicado às ${keys.length} combinações deste grupo.`}
              </small>
            ) : (
              <small>Prazo não configurado.</small>
            )}
          </div>
        );
      })}
    </div>
  );
}
