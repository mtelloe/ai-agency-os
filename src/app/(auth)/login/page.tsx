'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  borderRadius: 20,
  padding: 36,
  maxWidth: 420,
  width: '100%',
};

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#fff',
  borderRadius: 10,
  padding: '10px 14px',
};

const labelStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.6)',
  fontSize: 13,
  fontWeight: 500,
};

const primaryButtonStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #C77DFF, #FF6FA3)',
  color: '#fff',
  border: 'none',
  boxShadow: '0 0 24px rgba(199,125,255,0.25)',
  width: '100%',
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(error.message === 'Invalid login credentials'
        ? 'Email o contraseña incorrectos'
        : error.message);
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <div style={glassCard}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 26,
            color: '#fff',
            marginBottom: 6,
          }}
        >
          <span
            style={{
              background: 'linear-gradient(135deg, #C77DFF 0%, #FF6FA3 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            AI
          </span>{' '}
          Agency OS
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>Accede a tu cuenta</p>
      </div>

      <form onSubmit={handleLogin}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Label htmlFor="email" style={labelStyle}>Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Label htmlFor="password" style={labelStyle}>Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Button type="submit" disabled={loading} style={primaryButtonStyle}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
          <Link
            href="/forgot-password"
            style={{
              textAlign: 'center',
              fontSize: 12,
              color: 'rgba(255,255,255,0.4)',
              textDecoration: 'none',
            }}
          >
            ¿Has olvidado tu contraseña?
          </Link>
          <p style={{ textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
            ¿No tienes cuenta?{' '}
            <Link
              href="/register"
              style={{ color: '#C77DFF', textDecoration: 'none' }}
            >
              Regístrate gratis
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
