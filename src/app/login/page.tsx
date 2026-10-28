'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Background } from '@/components/Background';
import { Icon } from '@/components/Icon';
import { Win } from '@/components/Win';
import { BRAND } from '@/lib/rooms';
import { useSession } from '@/lib/session';

function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, ready, signIn, signUp, mode } = useSession();
  const [signup, setSignup] = useState(params.get('mode') === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace('/hotel');
  }, [ready, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    try {
      if (signup) {
        const msg = await signUp(email, password);
        if (msg) setInfo(msg);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="landing" style={{ justifyContent: 'center', padding: 16 }}>
      <div style={{ width: 'min(440px, 100%)', margin: '0 auto' }}>
        <p style={{ textAlign: 'center' }}>
          <Link href="/" className="h-pixel" style={{ textDecoration: 'none', textShadow: '2px 2px 0 var(--pink), -1px -1px 0 var(--cyan)' }}>
            {BRAND}
          </Link>
        </p>
        <Win title={signup ? 'nueva_partida.exe' : 'cargar_partida.exe'} tone="pink">
          <form className="stack" onSubmit={submit}>
            <p className="kicker" style={{ margin: 0 }}>&gt; {signup ? 'CREA TU PERSONAJE' : 'INSERT COIN'}</p>
            <label className="field">
              <span>{mode === 'cloud' ? 'EMAIL' : 'USUARIO O EMAIL'}</span>
              <input
                className="input"
                type={mode === 'cloud' ? 'email' : 'text'}
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="field">
              <span>CONTRASEÑA</span>
              <input
                className="input"
                type="password"
                autoComplete={signup ? 'new-password' : 'current-password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && <p style={{ color: 'var(--red)', margin: 0 }}>✖ {error}</p>}
            {info && <p style={{ color: 'var(--green)', margin: 0 }}>✔ {info}</p>}
            <button className="btn btn-solid" disabled={busy}>
              <Icon name={signup ? 'sparkles' : 'key'} /> {busy ? 'CARGANDO...' : signup ? 'CREAR CUENTA' : 'ENTRAR'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setSignup(!signup)}>
              {signup ? '¿Ya tienes cuenta? Entrar' : '¿Nuevo? Crear cuenta'}
            </button>
            <p className="dim" style={{ margin: 0, fontSize: 16 }}>
              <Icon name="lock" />{' '}
              {mode === 'cloud'
                ? 'Tus notas y archivos son privados: solo tu cuenta puede verlos.'
                : 'MODO LOCAL: los datos se guardan solo en este navegador. Configura Supabase para cuentas reales en la nube.'}
            </p>
          </form>
        </Win>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <>
      <Background />
      <Suspense>
        <LoginForm />
      </Suspense>
    </>
  );
}
