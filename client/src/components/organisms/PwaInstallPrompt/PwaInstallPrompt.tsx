import { useEffect, useState, type JSX } from 'react';

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

export default function PwaInstallPrompt(): JSX.Element | null {
  const [isInstallableOnIos, setIsInstallableOnIos] = useState<boolean>(false);
  const [promptDismissed, setPromptDismissed] = useState<boolean>(false);
  const [instructionsOpen, setInstructionsOpen] = useState<boolean>(false);

  useEffect(() => {
    const userAgent = navigator.userAgent;
    const isIos =
      /iPhone|iPad|iPod/i.test(userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone =
      (window.matchMedia?.('(display-mode: standalone)').matches ?? false) ||
      (navigator as NavigatorWithStandalone).standalone === true;

    setIsInstallableOnIos(isIos && !isStandalone);
  }, []);

  if (!isInstallableOnIos || promptDismissed) return null;

  return (
    <>
      <aside className="pwa-install-prompt" aria-label="Instalar Tá Marcado">
        <p>Tenha o Tá Marcado na tela inicial do seu iPhone.</p>
        <button type="button" onClick={() => setInstructionsOpen(true)}>
          Adicionar app
        </button>
        <button
          className="pwa-install-dismiss"
          type="button"
          aria-label="Fechar aviso de instalação"
          onClick={() => setPromptDismissed(true)}
        >
          ×
        </button>
      </aside>
      {instructionsOpen && (
        <div
          className="pwa-install-backdrop"
          onClick={() => setInstructionsOpen(false)}
        >
          <section
            className="pwa-install-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="pwa-install-close"
              type="button"
              aria-label="Fechar instruções"
              onClick={() => setInstructionsOpen(false)}
            >
              ×
            </button>
            <h2 id="pwa-install-title">Adicione à tela inicial</h2>
            <p>Para usar o Tá Marcado como app no iPhone:</p>
            <ol>
              <li>Abra esta página no Safari e toque em Compartilhar.</li>
              <li>Role as opções e escolha “Adicionar à Tela de Início”.</li>
              <li>Confirme tocando em “Adicionar”.</li>
            </ol>
          </section>
        </div>
      )}
    </>
  );
}
