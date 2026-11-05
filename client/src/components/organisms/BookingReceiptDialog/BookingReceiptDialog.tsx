import type { JSX, MouseEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { BookingReceipt } from '../../../interfaces/booking.interface';
import { PaymentUtil } from '../../../utils/payment.util';
import { DateUtil } from '../../../utils/date.util';

type BookingReceiptDialogProps = {
  receipt: BookingReceipt | null;
  businessName: string;
  productName: string;
  appointmentShareText: string;
  shareError: string;
  onShare: () => Promise<void>;
  onClose: () => void;
};

export default function BookingReceiptDialog({
  receipt,
  businessName,
  productName,
  appointmentShareText,
  shareError,
  onShare,
  onClose,
}: Readonly<BookingReceiptDialogProps>): JSX.Element {
  return (
    <AnimatePresence>
      {receipt && (
        <motion.div
          className="receipt-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.section
            className="receipt-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-title"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            onClick={(event: MouseEvent) => event.stopPropagation()}
          >
            <button
              className="receipt-close"
              type="button"
              aria-label="Fechar comprovante"
              onClick={onClose}
            >
              ×
            </button>
            <span className="receipt-check" aria-hidden="true">
              ✓
            </span>
            <p className="eyebrow">COMPROVANTE DE AGENDAMENTO</p>
            <h2 id="receipt-title">Solicitação enviada!</h2>
            <p className="receipt-business">{businessName}</p>
            <div className="receipt-divider" />
            <dl className="receipt-details">
              <div>
                <dt>Serviço</dt>
                <dd>{productName}</dd>
              </div>
              <div>
                <dt>Data</dt>
                <dd>
                  {DateUtil.productDate(
                    receipt.startsAt,
                    receipt.estimatedDelivery?.timezone ?? 'America/Sao_Paulo',
                  )}
                </dd>
              </div>
              <div>
                <dt>Horário</dt>
                <dd>{DateUtil.formatTimeRange(receipt)}</dd>
              </div>
              <div>
                <dt>Profissional</dt>
                <dd>{receipt.professionalName}</dd>
              </div>
              {receipt.estimatedDelivery && (
                <div>
                  <dt>Previsão oficial de conclusão</dt>
                  <dd>
                    {DateUtil.civilDate(receipt.estimatedDelivery.estimatedDate)} (até{' '}
                    {receipt.estimatedDelivery.days} dias corridos)
                  </dd>
                </div>
              )}
              <div>
                <dt>Forma de pagamento informada</dt>
                <dd>
                  {PaymentUtil.paymentMethodLabel(receipt.paymentMethod)}
                  {receipt.paymentMethod === 'credit' && receipt.installments
                    ? ` em ${receipt.installments}x sem juros`
                    : ''}
                </dd>
              </div>
              <div>
                <dt>Cliente</dt>
                <dd>{receipt.customerName || 'Cliente'}</dd>
              </div>
              <div>
                <dt>Celular</dt>
                <dd>{receipt.customerPhone}</dd>
              </div>
              <div>
                <dt>Protocolo</dt>
                <dd>{receipt.appointmentId}</dd>
              </div>
            </dl>
            <div className="receipt-share" aria-label="Compartilhar agendamento">
              <a
                className="receipt-share-link"
                href={`https://wa.me/?text=${encodeURIComponent(appointmentShareText)}`}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
              <a
                className="receipt-share-link"
                href={`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(`Agendamento - ${productName}`)}&body=${encodeURIComponent(appointmentShareText)}`}
                target="_blank"
                rel="noreferrer"
              >
                E-mail
              </a>
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button className="receipt-share-link" type="button" onClick={onShare}>
                  Compartilhar
                </button>
              )}
            </div>
            {shareError && (
              <p role="alert" className="error">
                {shareError}
              </p>
            )}
            <p className="receipt-note">
              A empresa recebeu sua solicitação e poderá entrar em contato para confirmar. A forma
              de pagamento é informativa; nenhum pagamento foi processado ou recebido.
            </p>
            <button className="button booking-submit" type="button" onClick={onClose}>
              Entendi
            </button>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
