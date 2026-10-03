import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';

const root = document.getElementById('root');

if (!root) throw new Error('Root element not found.');

createRoot(root).render(
  <StrictMode>
    <main style={{ maxWidth: 720, margin: '4rem auto', padding: '1rem' }}>
      <h1>Área do colaborador</h1>
      <p>A fundação de autenticação e acesso está pronta para a próxima etapa.</p>
    </main>
  </StrictMode>,
);
