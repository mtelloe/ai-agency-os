'use client';

import { useState } from 'react';
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Si el email existe, recibirás un enlace para restablecer tu contraseña');
    } catch {
      toast.error('Ha ocurrido un error. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={glassCard}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 24,
            color: '#fff',
            marginBottom: 6,
          }}
        >
          Recuperar contraseña
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>
          Te enviaremos un enlace para restablecer tu contraseña
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
          <Label htmlFor="email" style={labelStyle}>Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Button type="submit" disabled={loading} style={primaryButtonStyle}>
            {loading ? 'Enviando...' : 'Enviar enlace'}
          </Button>
          <Link
            href="/login"
            style={{ textAlign: 'center', fontSize: 14, color: '#C77DFF', textDecoration: 'none' }}
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </form>
    </div>
  );
}
