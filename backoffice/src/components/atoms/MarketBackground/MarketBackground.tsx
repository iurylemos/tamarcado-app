import { useMemo, type JSX } from 'react';
import { motion } from 'framer-motion';

export default function MarketBackground(): JSX.Element {
  const floaters = useMemo<string[]>(
    () => ['🛍️', '✂️', '💅', '🏪', '💆', '🚗', '🏷️', '💈', '🧴', '🎁', '⭐', '🛒'],
    [],
  );

  return (
    <div className="market-bg" aria-hidden="true">
      {floaters.map((icon, index) => (
        <motion.span
          key={icon}
          style={{
            left: `${(index * 83) % 96}%`,
            top: `${(index * 37) % 90}%`,
            fontSize: `${2 + (index % 3)}rem`,
          }}
          animate={{ y: [0, -28, 0], rotate: [-8, 8, -8] }}
          transition={{
            duration: 6 + (index % 5),
            repeat: Infinity,
            ease: 'easeInOut',
            delay: index * 0.3,
          }}
        >
          {icon}
        </motion.span>
      ))}
    </div>
  );
}
