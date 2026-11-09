import type { JSX } from 'react';
import { motion } from 'framer-motion';
import type {
  AvailableProfessional,
  AvailableSlot,
} from '@shared/interfaces/availability.interface';
import { DateUtil } from '../../../utils/date.util';
import SkeletonCard from '../../molecules/SkeletonCard/SkeletonCard';
import ProfessionalSelector from '../ProfessionalSelector/ProfessionalSelector';

type BookingAvailabilityProps = {
  estimatedCheckout: boolean;
  estimatedDeliveryDays?: number;
  provisionalEstimatedDate?: string;
  estimateUnavailableMessage?: string;
  date: string;
  minimumDate: string;
  onDateChange: (date: string) => void;
  professionals: AvailableProfessional[];
  selectedProfessionalId: string;
  onProfessionalChange: (professionalId: string) => void;
  availabilityLoading: boolean;
  slots: AvailableSlot[];
  visibleSlots: AvailableSlot[];
  selectedStartsAt: string;
  onTimeChange: (startsAt: string) => void;
  searchingNextDate: boolean;
  nextDateSearchComplete: boolean;
  nextDateSearchError: string;
  error: string;
  durationMinutes: number;
};

export default function BookingAvailability({
  estimatedCheckout,
  estimatedDeliveryDays,
  provisionalEstimatedDate,
  estimateUnavailableMessage,
  date,
  minimumDate,
  onDateChange,
  professionals,
  selectedProfessionalId,
  onProfessionalChange,
  availabilityLoading,
  slots,
  visibleSlots,
  selectedStartsAt,
  onTimeChange,
  searchingNextDate,
  nextDateSearchComplete,
  nextDateSearchError,
  error,
  durationMinutes,
}: Readonly<BookingAvailabilityProps>): JSX.Element {
  return (
    <>
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            {estimatedCheckout ? '1. PRAZO E PROFISSIONAL' : '1. ESCOLHA A DATA E O HORÁRIO'}
          </p>
          <h2>{estimatedCheckout ? 'Previsão e profissional' : 'Quando você quer vir?'}</h2>
        </div>
      </div>

      {estimatedCheckout ? (
        <div className="state-card state-card-compact flex-col">
          {estimatedDeliveryDays !== undefined ? (
            <p>
              <b>Prazo estimado:</b> até {estimatedDeliveryDays} dias corridos.
            </p>
          ) : (
            <p role="status">O prazo estimado não está disponível para esta opção.</p>
          )}
          {provisionalEstimatedDate ? (
            <p>
              <b>Previsão provisória:</b> {DateUtil.provisionalDate(provisionalEstimatedDate)}
            </p>
          ) : estimateUnavailableMessage ? (
            <p role="status">{estimateUnavailableMessage}</p>
          ) : null}
          <p className="muted">
            A data é uma previsão, não uma confirmação de entrega ou conclusão.
          </p>
        </div>
      ) : (
        <label className="field" htmlFor="booking-date">
          Data do atendimento
          <input
            id="booking-date"
            type="date"
            value={date}
            min={minimumDate}
            onChange={(event) => onDateChange(event.target.value)}
          />
        </label>
      )}

      {availabilityLoading ? (
        <>
          <p className="skeleton-status" role="status">
            {estimatedCheckout
              ? 'Verificando profissionais com horários nos próximos 31 dias...'
              : 'Buscando horários disponíveis...'}
          </p>
          {!estimatedCheckout && (
            <div className="slot-grid" aria-label="Carregando horários disponíveis">
              {Array.from({ length: 4 }, (_, index) => (
                <SkeletonCard key={`booking-time-skeleton-${index}`} variant="time" />
              ))}
            </div>
          )}
        </>
      ) : (
        <ProfessionalSelector
          professionals={professionals}
          value={selectedProfessionalId}
          onChange={onProfessionalChange}
        />
      )}

      {!availabilityLoading &&
        !estimatedCheckout &&
        slots.length === 0 &&
        professionals.length > 0 && (
          <p role="status" className="state-card state-card-compact">
            Não há horários disponíveis para esta data.
          </p>
        )}

      {!availabilityLoading && estimatedCheckout && professionals.length === 0 && (
        <p role="status" className="state-card state-card-compact">
          Não há profissionais com horário reservável nos próximos 31 dias.
        </p>
      )}

      {!estimatedCheckout && !availabilityLoading && slots.length === 0 && (
        <div className="next-availability">
          {searchingNextDate && (
            <>
              <p className="skeleton-status" role="status">
                Procurando o próximo dia com horários...
              </p>
              <div className="slot-grid" aria-label="Carregando próximos horários">
                {Array.from({ length: 2 }, (_, index) => (
                  <SkeletonCard key={`next-date-time-skeleton-${index}`} variant="time" />
                ))}
              </div>
            </>
          )}
          {nextDateSearchComplete && !nextDateSearchError && (
            <p className="muted">
              Não encontramos horários nos próximos 30 dias. Escolha outra data.
            </p>
          )}
          {nextDateSearchError && (
            <p className="error" role="alert">
              {nextDateSearchError}
            </p>
          )}
        </div>
      )}

      {!estimatedCheckout && visibleSlots.length > 0 && (
        <fieldset className="slot-fieldset">
          <legend>Horários disponíveis</legend>
          <div className="slot-grid">
            {visibleSlots.map((slot, index) => (
              <motion.label
                key={`${slot.professionalId}-${slot.startsAt}`}
                className={`slot-option${selectedStartsAt === slot.startsAt ? ' is-selected' : ''}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.95 }}
                transition={{ delay: Math.min(index, 12) * 0.025 }}
              >
                <input
                  type="radio"
                  name="booking-time"
                  value={slot.startsAt}
                  checked={selectedStartsAt === slot.startsAt}
                  onChange={() => onTimeChange(slot.startsAt)}
                />
                <span>{DateUtil.formatTimeRange(slot)}</span>
              </motion.label>
            ))}
          </div>
          <p className="slot-help">
            Cada opção mostra o início e o fim do atendimento ({durationMinutes} min).
          </p>
        </fieldset>
      )}

      {error && !selectedStartsAt && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </>
  );
}
