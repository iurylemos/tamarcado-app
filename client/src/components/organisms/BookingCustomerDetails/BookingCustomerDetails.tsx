import { useEffect, useRef, type JSX } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { BookingFormValues } from '../../../interfaces/booking.interface';
import BookingForm from '../BookingForm/BookingForm';

type BookingCustomerDetailsProps = {
  canSubmit: boolean;
  busy: boolean;
  error: string;
  onSubmit: (values: BookingFormValues) => Promise<void>;
};

export default function BookingCustomerDetails({
  canSubmit,
  busy,
  error,
  onSubmit,
}: Readonly<BookingCustomerDetailsProps>): JSX.Element {
  const contactRef = useRef<HTMLDivElement>(null);
  const wasReady = useRef<boolean>(false);
  const shouldScrollToContact = useRef<boolean>(false);

  useEffect(() => {
    const justBecameReady = canSubmit && !wasReady.current;
    wasReady.current = canSubmit;
    if (!justBecameReady) return;

    shouldScrollToContact.current = true;
  }, [canSubmit]);

  const scrollToContactAfterExpand = (): void => {
    if (!shouldScrollToContact.current) return;

    shouldScrollToContact.current = false;

    const contactElement = contactRef.current;

    if (!contactElement || typeof contactElement.scrollIntoView !== 'function') return;

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    contactElement.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'center',
    });
  };

  return (
    <AnimatePresence initial={false}>
      {canSubmit && (
        <motion.div
          ref={contactRef}
          className="booking-contact"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          onAnimationComplete={scrollToContactAfterExpand}
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">2. SEUS DADOS</p>
              <h2>Quase lá!</h2>
            </div>
          </div>
          <BookingForm onSubmit={onSubmit} busy={busy} error={error} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
