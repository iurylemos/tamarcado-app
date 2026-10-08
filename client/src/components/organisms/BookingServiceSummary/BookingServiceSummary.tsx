import type { JSX } from 'react';
import { motion } from 'framer-motion';
import { formatBrl } from '@shared/money';
import type { CompanyCatalog, PublicProductSummary } from '../../../interfaces/company.interface';

type BookingServiceSummaryProps = {
  catalog: CompanyCatalog;
  product: PublicProductSummary;
};

export default function BookingServiceSummary({
  catalog,
  product,
}: Readonly<BookingServiceSummaryProps>): JSX.Element {
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
      {product.description && <p>{product.description}</p>}
      <div className="booking-summary-details">
        <span>{formatBrl(product.priceCents)}</span>
        <span>{product.durationMinutes} minutos</span>
      </div>
    </motion.aside>
  );
}
