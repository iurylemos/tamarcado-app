import { useEffect, useState, type FormEvent, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/auth/auth.context';
import { authErrorMessage } from '../services/auth.service';

export default function LoginPage(): JSX.Element {
  const { user, error: sessionError, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
    } catch (loginError: unknown) {
      setError(authErrorMessage(loginError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-login">
      <section className="auth-login__card" aria-labelledby="login-title">
        <p className="auth-login__eyebrow">TAMARCADO · BACKOFFICE</p>
        <h1 id="login-title">Gestão da empresa</h1>
        <p>Entre com o e-mail e a senha da sua conta.</p>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <label htmlFor="auth-email">E-mail</label>
          <input
            id="auth-email"
            type="email"
            autoComplete="username"
            placeholder="nome@suaempresa.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <label htmlFor="auth-password">Senha</label>
          <input
            id="auth-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button type="submit" disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        {(error || sessionError) && (
          <p className="auth-login__error" role="alert">
            {error || sessionError}
          </p>
        )}
      </section>
    </main>
  );
}
