import { useMemo, useState, type JSX } from 'react';
import { motion } from 'framer-motion';
import { formatBrl } from '@shared/money';
import { resolveProductPricing, type ResolvedProductPricing } from '@shared/product-price';
import type { CompanyCatalog, PublicProductSummary } from '../../../interfaces/company.interface';
import { ComboUtil } from '../../../utils/combo.util';
import type {
  ProductCustomizationAttribute,
  ProductCustomizationSelection,
  ProductImage,
} from '@shared/interfaces/product.interface';
import ProductImageGallery from '../ProductImageGallery/ProductImageGallery';

type PriceSelection = {
  attributeId: string;
  optionId: string;
};

type PriceVariant = {
  selections: ProductCustomizationSelection[];
  combinationLabel: string;
  pricing: ResolvedProductPricing;
};

type BookingServiceSummaryProps = {
  catalog: CompanyCatalog;
  product: PublicProductSummary;
  customizationSelections: ProductCustomizationSelection[];
  onCustomizationChange: (selections: ProductCustomizationSelection[]) => void;
  images: ProductImage[];
  selectedImageId: string;
  onImageSelect: (imageId: string) => void;
};

export default function BookingServiceSummary({
  catalog,
  product,
  customizationSelections,
  onCustomizationChange,
  images,
  selectedImageId,
  onImageSelect,
}: Readonly<BookingServiceSummaryProps>): JSX.Element {
  const [comboNotice, setComboNotice] = useState<string>('');

  const isCombo = useMemo<boolean>(() => ComboUtil.hasComboItems(product), [product]);

  const comboVariants = useMemo<ProductCustomizationSelection[][]>(
    () => (isCombo ? ComboUtil.validComboVariants(product) : []),
    [isCombo, product],
  );

  const attributes = useMemo<ProductCustomizationAttribute[]>(
    () => product.customizationAttributes ?? [],
    [product.customizationAttributes],
  );

  const priceSelections = useMemo<PriceSelection[]>(
    () =>
      attributes.map((attribute) => ({
        attributeId: attribute.id,
        optionId:
          customizationSelections.find((selection) => selection.attributeId === attribute.id)
            ?.optionId ?? attribute.defaultOptionId,
      })),
    [attributes, customizationSelections],
  );

  const selectedPricing = useMemo<ResolvedProductPricing | undefined>(
    () => resolveProductPricing(product, priceSelections),
    [product, priceSelections],
  );

  const defaultComboUnavailable = useMemo<boolean>(
    () =>
      isCombo &&
      !!product.variantPrices?.length &&
      comboVariants.length > 0 &&
      !comboVariants.some((variant) =>
        attributes.every((attribute) =>
          variant.some(
            (selection) =>
              selection.attributeId === attribute.id &&
              selection.optionId === attribute.defaultOptionId,
          ),
        ),
      ),
    [isCombo, product.variantPrices, comboVariants, attributes],
  );

  const variantPrices = useMemo<PriceVariant[] | undefined>(
    () =>
      isCombo
        ? undefined
        : product.variantPrices?.flatMap((variant) => {
            const validCombination =
              variant.selections.length === attributes.length &&
              attributes.every((attribute) =>
                variant.selections.some(
                  (selection) =>
                    selection.attributeId === attribute.id &&
                    attribute.options.some((option) => option.id === selection.optionId),
                ),
              );
            if (!validCombination) return [];

            const pricing = resolveProductPricing(product, variant.selections);
            if (!pricing) return [];

            const combinationLabel = attributes
              .map((attribute) => {
                const selection = variant.selections.find(
                  (item) => item.attributeId === attribute.id,
                );
                return attribute.options.find((option) => option.id === selection?.optionId)?.label;
              })
              .filter((label): label is string => label !== undefined)
              .join(' + ');

            const selections = attributes.map((attribute) => ({
              attributeId: attribute.id,
              optionId:
                variant.selections.find((item) => item.attributeId === attribute.id)?.optionId ??
                attribute.defaultOptionId,
            }));

            return [{ combinationLabel, pricing, selections }];
          }),
    [product, attributes, isCombo],
  );

  const selectCustomization = (
    selections: ProductCustomizationSelection[],
    input: HTMLInputElement,
  ): void => {
    onCustomizationChange(selections);

    const bookingPanel = input
      .closest('.booking-layout')
      ?.querySelector<HTMLElement>('.booking-panel');
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    bookingPanel?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  return (
    <div className="booking-product-column">
      {(attributes.length > 0 || !!variantPrices?.length) && (
        <section className="booking-summary-choices-card" aria-labelledby="booking-choice-heading">
          <p className="eyebrow">PERSONALIZE SEU SERVIÇO</p>
          <h3 id="booking-choice-heading">Escolha suas opções</h3>
          {isCombo ? (
            <div className="combo-items">
              <p className="muted">Escolha as opções de cada item do combo.</p>
              {defaultComboUnavailable && (
                <p role="status">
                  A combinação padrão não está disponível. Confira as opções selecionadas.
                </p>
              )}
              {product.variantPrices?.length && comboVariants.length === 0 && (
                <p className="error" role="alert">
                  Não há combinações disponíveis para este combo. Volte ao catálogo e escolha outro
                  serviço.
                </p>
              )}
              {product.comboItems?.map((item) => (
                <fieldset className="combo-item" key={item.id}>
                  <legend>{item.label}</legend>
                  {attributes
                    .filter((attribute) => attribute.comboItemId === item.id)
                    .map((attribute) => (
                      <label className="field" key={attribute.id}>
                        {attribute.label}
                        <select
                          value={
                            priceSelections.find(
                              (selection) => selection.attributeId === attribute.id,
                            )?.optionId ?? ''
                          }
                          disabled={!!product.variantPrices?.length && comboVariants.length === 0}
                          onChange={(event) => {
                            const required = {
                              attributeId: attribute.id,
                              optionId: event.target.value,
                            };
                            const next = product.variantPrices?.length
                              ? ComboUtil.closestComboSelection(
                                  comboVariants,
                                  priceSelections,
                                  required,
                                )
                              : priceSelections.map((selection) =>
                                  selection.attributeId === attribute.id ? required : selection,
                                );
                            if (!next) return;
                            const changedOthers = next.some(
                              (selection) =>
                                selection.attributeId !== attribute.id &&
                                priceSelections.some(
                                  (old) =>
                                    old.attributeId === selection.attributeId &&
                                    old.optionId !== selection.optionId,
                                ),
                            );
                            setComboNotice(
                              changedOthers
                                ? 'Outras opções foram ajustadas para manter uma combinação disponível.'
                                : '',
                            );
                            onCustomizationChange(next);
                          }}
                        >
                          {attribute.options.map((option) => (
                            <option
                              key={option.id}
                              value={option.id}
                              disabled={
                                !!product.variantPrices?.length &&
                                !comboVariants.some((variant) =>
                                  variant.some(
                                    (selection) =>
                                      selection.attributeId === attribute.id &&
                                      selection.optionId === option.id,
                                  ),
                                )
                              }
                            >
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                </fieldset>
              ))}
              <p role="status">{comboNotice}</p>
            </div>
          ) : variantPrices?.length ? (
            <fieldset className="booking-summary-options">
              <legend>Combinações disponíveis</legend>
              <div className="booking-summary-option-list">
                {variantPrices.map(({ combinationLabel, pricing, selections }) => (
                  <label className="booking-summary-option" key={combinationLabel}>
                    <input
                      type="radio"
                      name={`product-${product.id}-combination`}
                      checked={selections.every((selection) =>
                        priceSelections.some(
                          (selected) =>
                            selected.attributeId === selection.attributeId &&
                            selected.optionId === selection.optionId,
                        ),
                      )}
                      onClick={(event) => {
                        if (
                          selections.every((selection) =>
                            priceSelections.some(
                              (selected) =>
                                selected.attributeId === selection.attributeId &&
                                selected.optionId === selection.optionId,
                            ),
                          )
                        ) {
                          selectCustomization(selections, event.currentTarget);
                        }
                      }}
                      onChange={(event) => selectCustomization(selections, event.currentTarget)}
                    />
                    <span className="booking-summary-option-content">
                      <span>{combinationLabel}</span>
                      <span className="booking-summary-option-price">
                        {pricing.promotionApplied && (
                          <del className="promotion-original-price">
                            {formatBrl(pricing.originalPriceCents)}
                          </del>
                        )}
                        <strong
                          className={pricing.promotionApplied ? 'promotion-current-price' : ''}
                        >
                          {formatBrl(pricing.effectivePriceCents)}
                        </strong>
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : (
            attributes.map((attribute) => (
              <fieldset className="booking-summary-options" key={attribute.id}>
                <legend>{attribute.label}</legend>
                <div className="booking-summary-option-list">
                  {attribute.options.map((option) => {
                    const selections = priceSelections.map((selection) =>
                      selection.attributeId === attribute.id
                        ? { ...selection, optionId: option.id }
                        : selection,
                    );

                    const pricing = resolveProductPricing(product, selections);

                    const checkPriceSelections =
                      priceSelections.find((selection) => selection.attributeId === attribute.id)
                        ?.optionId === option.id;

                    return (
                      <label className="booking-summary-option" key={option.id}>
                        <input
                          type="radio"
                          name={`product-${product.id}-${attribute.id}`}
                          checked={checkPriceSelections}
                          onClick={(event) => {
                            if (checkPriceSelections) {
                              selectCustomization(selections, event.currentTarget);
                            }
                          }}
                          onChange={(event) => selectCustomization(selections, event.currentTarget)}
                        />
                        <span className="booking-summary-option-content">
                          <span>{option.label}</span>
                          <span className="booking-summary-option-price">
                            {pricing ? (
                              <>
                                {pricing.promotionApplied && (
                                  <del className="promotion-original-price">
                                    {formatBrl(pricing.originalPriceCents)}
                                  </del>
                                )}
                                <strong
                                  className={
                                    pricing.promotionApplied ? 'promotion-current-price' : ''
                                  }
                                >
                                  {formatBrl(pricing.effectivePriceCents)}
                                </strong>
                              </>
                            ) : (
                              <strong>Preço indisponível</strong>
                            )}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))
          )}
        </section>
      )}
      <motion.aside
        className="booking-summary"
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <p className="eyebrow">SERVIÇO ESCOLHIDO</p>
        <span className="booking-summary-icon" aria-hidden="true">
          ✂
        </span>
        <p className="muted">{catalog.business.name}</p>
        <h2>{product.name}</h2>
        <ProductImageGallery
          images={images}
          selectedImageId={selectedImageId}
          onSelect={onImageSelect}
          productName={product.name}
        />
        {product.description && <p>{product.description}</p>}
        {isCombo ? (
          <div className="combo-review" aria-label="Resumo das escolhas do combo">
            {product.comboItems?.map((item) => (
              <section key={item.id}>
                <h3>{item.label}</h3>
                <ul className="booking-summary-customizations">
                  {customizationSelections.flatMap((selection) => {
                    const attribute = attributes.find(
                      (candidate) =>
                        candidate.id === selection.attributeId && candidate.comboItemId === item.id,
                    );
                    const option = attribute?.options.find(
                      (candidate) => candidate.id === selection.optionId,
                    );
                    return attribute && option
                      ? [
                          <li key={selection.attributeId}>
                            {attribute.label}: <strong>{option.label}</strong>
                          </li>,
                        ]
                      : [];
                  })}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          customizationSelections.length > 0 && (
            <ul className="booking-summary-customizations">
              {customizationSelections.map((selection) => {
                const attribute = product.customizationAttributes?.find(
                  (item) => item.id === selection.attributeId,
                );
                const option = attribute?.options.find((item) => item.id === selection.optionId);
                if (!attribute || !option) return null;
                return (
                  <li key={selection.attributeId}>
                    {attribute.label}: <strong>{option.label}</strong>
                  </li>
                );
              })}
            </ul>
          )
        )}
        <div className="booking-summary-details">
          <span>
            {selectedPricing === undefined ? (
              'Preço indisponível'
            ) : (
              <>
                <span className={selectedPricing.promotionApplied ? 'promotion-price-values' : ''}>
                  {selectedPricing.promotionApplied && (
                    <del className="promotion-original-price">
                      {formatBrl(selectedPricing.originalPriceCents)}
                    </del>
                  )}
                  <strong
                    className={selectedPricing.promotionApplied ? 'promotion-current-price' : ''}
                  >
                    {formatBrl(selectedPricing.effectivePriceCents)}
                  </strong>
                </span>
              </>
            )}
          </span>
          {!product.estimatedDeliveryEnabled && <span>{product.durationMinutes} minutos</span>}
        </div>
      </motion.aside>
    </div>
  );
}
