'use client';

import { useState, type FormEvent } from 'react';
import { ArrowRight, LockKeyhole, WalletCards } from 'lucide-react';

export function LoginForm({ configured }: { configured: boolean }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.message || 'No pudimos iniciar sesión. Inténtalo de nuevo.');
        return;
      }
      window.location.assign('/');
    } catch {
      setError('No pudimos conectar. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return <main className="login-screen"><section className="login-card" aria-labelledby="login-title">
    <div className="login-brand"><span className="brand-mark"><WalletCards size={17}/></span><span>bolsillo</span></div>
    <div className="login-icon"><LockKeyhole size={19}/></div>
    <p className="login-eyebrow">TU ESPACIO PERSONAL</p>
    <h1 id="login-title">Tus finanzas, a puerta cerrada.</h1>
    <p className="login-copy">Ingresa tu contraseña para abrir tu resumen financiero.</p>
    {!configured ? <div className="login-message" role="status">Falta configurar <code>DASHBOARD_PASSWORD</code> y <code>AUTH_SECRET</code> en las variables de entorno de Vercel.</div> : <form className="login-form" onSubmit={submit}>
      <label htmlFor="dashboard-password">Contraseña</label>
      <input id="dashboard-password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event)=>setPassword(event.target.value)} required/>
      {error && <p className="login-error" role="alert">{error}</p>}
      <button type="submit" disabled={loading || !password}>{loading?'Verificando…':'Entrar'} <ArrowRight size={15}/></button>
    </form>}
    <p className="login-footnote"><LockKeyhole size={12}/> Sesión privada · solo lectura</p>
  </section></main>;
}
