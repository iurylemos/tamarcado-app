import { useMemo, type JSX } from 'react';
import { motion } from 'framer-motion';
import { formatBrl } from '@shared/money';
import { resolveProductPricing, type ResolvedProductPricing } from '@shared/product-price';
import type { CompanyCatalog, PublicProductSummary } from '../../../interfaces/company.interface';
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
  combinationLabel: string;
  pricing: ResolvedProductPricing | undefined;
};

type BookingServiceSummaryProps = {
  catalog: CompanyCatalog;
  product: PublicProductSummary;
  customizationSelections: ProductCustomizationSelection[];
  onCustomizationChange: (attributeId: string, optionId: string) => void;
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

  const variantPrices = useMemo<PriceVariant[] | undefined>(
    () =>
      product.variantPrices?.map((variant) => {
        const pricing = resolveProductPricing(product, variant.selections);
        const combinationLabel = variant.selections
          .map((selection) => {
            const attribute = attributes.find((item) => item.id === selection.attributeId);
            const option = attribute?.options.find((item) => item.id === selection.optionId);
            return attribute && option ? `${attribute.label}: ${option.label}` : null;
          })
          .filter((label): label is string => label !== null)
          .join(' · ');

        return { combinationLabel, pricing };
      }),
    [product, attributes],
  );

  return (
    <motion.aside
      className="booking-summary"
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <p className="eyebrow">RESUMO DO SERVIÇO</p>
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
      {attributes.map((attribute) => (
        <fieldset className="booking-summary-options" key={attribute.id}>
          <legend>{attribute.label}</legend>
          <div className="booking-summary-option-list">
            {attribute.options.map((option) => (
              <label className="booking-summary-option" key={option.id}>
                <input
                  type="radio"
                  name={`product-${product.id}-${attribute.id}`}
                  checked={
                    priceSelections.find((selection) => selection.attributeId === attribute.id)
                      ?.optionId === option.id
                  }
                  onChange={() => onCustomizationChange(attribute.id, option.id)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      {!!variantPrices?.length && (
        <ul className="booking-summary-variant-prices" aria-label="Preços das combinações">
          {variantPrices.map(({ combinationLabel, pricing }, index) => (
            <li
              className="booking-summary-variant-price"
              key={`${combinationLabel ?? 'combination'}-${index}`}
            >
              <span>{combinationLabel || 'Combinação indisponível'}</span>
              {pricing ? (
                <span>
                  {pricing.promotionApplied && <del>{formatBrl(pricing.originalPriceCents)}</del>}
                  <strong>{formatBrl(pricing.effectivePriceCents)}</strong>
                </span>
              ) : (
                <strong>Preço indisponível</strong>
              )}
            </li>
          ))}
        </ul>
      )}
      {customizationSelections.length > 0 && (
        <ul className="booking-summary-customizations">
          {customizationSelections.map((selection) => {
            const attribute = product.customizationAttributes?.find(
              (item) => item.id === selection.attributeId,
            );
            const option = attribute?.options.find((item) => item.id === selection.optionId);
            if (!attribute || !option) return null;
            return (
              <li key={selection.attributeId}>
                <strong>{attribute.label}:</strong> {option.label}
              </li>
            );
          })}
        </ul>
      )}
      <div className="booking-summary-details">
        <span>
          {selectedPricing === undefined ? (
            'Preço indisponível'
          ) : (
            <>
              {selectedPricing.promotionApplied && (
                <del>{formatBrl(selectedPricing.originalPriceCents)}</del>
              )}
              <strong>{formatBrl(selectedPricing.effectivePriceCents)}</strong>
            </>
          )}
        </span>
        <span>{product.durationMinutes} minutos</span>
      </div>
    </motion.aside>
  );
}
