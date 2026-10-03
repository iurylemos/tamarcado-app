import { useEffect, useState, type FormEvent, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/auth/auth.context';
import { authErrorMessage } from '../services/auth.service';

export default function LoginPage(): JSX.Element {
  const { user, error: sessionError, requestCode, verifyCode } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const handleRequestCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      setChallengeId(await requestCode(phone));
    } catch (requestError: unknown) {
      setError(authErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await verifyCode(challengeId, phone, code);
    } catch (verificationError: unknown) {
      setError(authErrorMessage(verificationError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-login">
      <section className="auth-login__card" aria-labelledby="login-title">
        <p className="auth-login__eyebrow">TAMARCADO · BACKOFFICE</p>
        <h1 id="login-title">Gestão da empresa</h1>
        <p>Entre com o telefone cadastrado para receber um código de verificação pelo WhatsApp.</p>
        {!challengeId ? (
          <form onSubmit={(event) => void handleRequestCode(event)}>
            <label htmlFor="auth-phone">Telefone com DDD</label>
            <input
              id="auth-phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="+55 (11) 99999-0000"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
            />
            <button type="submit" disabled={busy}>
              {busy ? 'Enviando código…' : 'Enviar código pelo WhatsApp'}
            </button>
          </form>
        ) : (
          <form onSubmit={(event) => void handleVerifyCode(event)}>
            <p role="status">Código solicitado para {phone}.</p>
            <label htmlFor="auth-code">Código de verificação</label>
            <input
              id="auth-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
            />
            <button type="submit" disabled={busy}>
              {busy ? 'Verificando…' : 'Confirmar código'}
            </button>
            <button
              type="button"
              className="auth-login__secondary"
              disabled={busy}
              onClick={() => {
                setChallengeId('');
                setCode('');
              }}
            >
              Alterar telefone
            </button>
          </form>
        )}
        {(error || sessionError) && (
          <p className="auth-login__error" role="alert">
            {error || sessionError}
          </p>
        )}
      </section>
    </main>
  );
}
