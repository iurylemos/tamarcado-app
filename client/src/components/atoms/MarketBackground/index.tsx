import type { JSX } from 'react';
import { MotionConfig, motion } from 'framer-motion';

const orbs = [
  { className: 'market-orb market-orb--a', x: [0, 24, 0], y: [0, 18, 0], duration: 16 },
  { className: 'market-orb market-orb--b', x: [0, -20, 0], y: [0, 26, 0], duration: 19 },
] as const;

export default function MarketBackground(): JSX.Element {
  return (
    <MotionConfig reducedMotion="user">
      <div className="market-bg" aria-hidden="true">
        {orbs.map((orb) => (
          <motion.span
            key={orb.className}
            className={orb.className}
            animate={{ x: [...orb.x], y: [...orb.y] }}
            transition={{ duration: orb.duration, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>
    </MotionConfig>
  );
}
