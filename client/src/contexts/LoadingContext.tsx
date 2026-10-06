import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type JSX,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type ActiveOperation = {
  id: number;
  message: string;
};

type LoadingContextValue = {
  runWithLoading: <T>(message: string, operation: () => Promise<T>) => Promise<T>;
};

const LoadingContext = createContext<LoadingContextValue>({
  runWithLoading: (_message, operation) => operation(),
});

export function LoadingProvider({ children }: Readonly<{ children: ReactNode }>): JSX.Element {
  const [operations, setOperations] = useState<ActiveOperation[]>([]);
  const nextId = useRef(0);

  const runWithLoading = useCallback(
    async <T,>(message: string, operation: () => Promise<T>): Promise<T> => {
      const id = ++nextId.current;
      setOperations((current) => [...current, { id, message }]);

      try {
        return await operation();
      } finally {
        setOperations((current) => current.filter((item) => item.id !== id));
      }
    },
    [],
  );

  const activeOperation = operations.at(-1);

  return (
    <LoadingContext.Provider value={{ runWithLoading }}>
      {children}
      <AnimatePresence>
        {activeOperation && (
          <motion.div
            className="app-loading-overlay"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="app-loading-card"
              initial={{ y: 14, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 8, scale: 0.98 }}
            >
              <motion.span
                className="app-loading-spinner"
                aria-hidden="true"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <span>{activeOperation.message}</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </LoadingContext.Provider>
  );
}

export function useAppLoading(): LoadingContextValue {
  return useContext(LoadingContext);
}
