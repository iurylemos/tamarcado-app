import type { JSX } from 'react';
import { motion } from 'framer-motion';

export default function BookingHero(): JSX.Element {
  return (
    <motion.header
      className="booking-hero"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
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
  );
}
