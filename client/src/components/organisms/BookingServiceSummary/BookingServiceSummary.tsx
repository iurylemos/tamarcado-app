import type { JSX } from 'react';
import { motion } from 'framer-motion';
import { formatBrl } from '@shared/money';
import { resolveProductPriceCents } from '@shared/product-price';
import type { CompanyCatalog, PublicProductSummary } from '../../../interfaces/company.interface';
import type {
  ProductCustomizationSelection,
  ProductImage,
} from '@shared/interfaces/product.interface';
import ProductImageGallery from '../ProductImageGallery/ProductImageGallery';

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
  const priceSelections =
    product.customizationAttributes?.map((attribute) => ({
      attributeId: attribute.id,
      optionId:
        customizationSelections.find((selection) => selection.attributeId === attribute.id)
          ?.optionId ?? attribute.defaultOptionId,
    })) ?? customizationSelections;
  const selectedPriceCents = resolveProductPriceCents(
    product.priceCents,
    product.variantPrices,
    priceSelections,
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
      {product.customizationAttributes?.map((attribute) => (
        <label className="field" key={attribute.id}>
          {attribute.label}
          <select
            value={
              customizationSelections.find((selection) => selection.attributeId === attribute.id)
                ?.optionId ?? attribute.defaultOptionId
            }
            onChange={(event) => onCustomizationChange(attribute.id, event.target.value)}
          >
            {attribute.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}
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
          {selectedPriceCents === undefined ? 'Preço indisponível' : formatBrl(selectedPriceCents)}
        </span>
        <span>{product.durationMinutes} minutos</span>
      </div>
    </motion.aside>
  );
}
