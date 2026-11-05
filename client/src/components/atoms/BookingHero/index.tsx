import type { JSX } from 'react';
import { MotionConfig, motion } from 'framer-motion';

export default function BookingHero(): JSX.Element {
  return (
    <MotionConfig reducedMotion="user">
      <motion.header
        className="booking-hero"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <div>
          <p className="eyebrow">AGENDAMENTO ONLINE</p>
          <h1>Seu próximo momento começa aqui.</h1>
          <p>Escolha um horário e deixe o resto com a gente.</p>
        </div>
        <div className="booking-hero-mark" aria-hidden="true">
          ✦
        </div>
      </motion.header>
    </MotionConfig>
  );
}
