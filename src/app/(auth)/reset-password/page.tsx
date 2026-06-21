'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, RefreshCw } from 'lucide-react';

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

const outlineButtonStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.7)',
  border: '1px solid rgba(255,255,255,0.15)',
  width: '100%',
};

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    async function handleAuthCallback() {
      // Method 1: token_hash in URL (direct link from our custom email template)
      const tokenHash = searchParams?.get('token_hash');
      const type = searchParams?.get('type');

      if (tokenHash && type === 'recovery') {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        });
        if (error) {
          setSessionError('Este enlace ya no es válido. Solicita uno nuevo.');
          return;
        }
        setSessionReady(true);
        return;
      }

      // Method 2: code in URL (PKCE flow from Supabase default redirect)
      const code = searchParams?.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setSessionError('Este enlace ya no es válido. Solicita uno nuevo.');
          return;
        }
        setSessionReady(true);
        return;
      }

      // Method 3: hash fragment (implicit flow)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
        return;
      }

      // Listen for PASSWORD_RECOVERY event from hash fragment
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setSessionReady(true);
          subscription.unsubscribe();
        }
      });

      setTimeout(() => {
        subscription.unsubscribe();
        supabase.auth.getSession().then(({ data: { session: s } }) => {
          if (s) {
            setSessionReady(true);
          } else {
            setSessionError('No se ha encontrado un enlace válido. Solicita uno nuevo.');
          }
        });
      }, 3000);
    }

    handleAuthCallback();
  }, []);

  async function handleResend() {
    if (!resendEmail) {
      toast.error('Introduce tu email');
      return;
    }
    setResending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resendEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResending(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Nuevo enlace enviado. Revisa tu bandeja y haz clic en el enlace del último email.');
      setSessionError('');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        if (error.message.includes('session')) {
          setSessionError('La sesión ha caducado. Solicita un nuevo enlace.');
          setSessionReady(false);
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success('Contraseña actualizada correctamente');
      router.push('/login');
    } catch {
      toast.error('Ha ocurrido un error. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  if (sessionError) {
    return (
      <div style={glassCard}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 22,
              color: '#fff',
              marginBottom: 8,
            }}
          >
            Enlace no válido
          </h1>
          <p style={{ color: 'rgba(255,100,100,0.9)', fontSize: 14 }}>{sessionError}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>
            Introduce tu email para recibir un nuevo enlace:
          </p>
          <Input
            type="email"
            placeholder="tu@email.com"
            value={resendEmail}
            onChange={(e) => setResendEmail(e.target.value)}
            style={inputStyle}
          />
          <Button style={primaryButtonStyle} onClick={handleResend} disabled={resending}>
            {resending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
            ) : (
              <><RefreshCw className="h-4 w-4 mr-2" /> Enviar nuevo enlace</>
            )}
          </Button>
          <Button style={outlineButtonStyle} onClick={() => router.push('/login')}>
            Volver al inicio de sesión
          </Button>
        </div>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div style={glassCard}>
        <div style={{ padding: '32px 0', textAlign: 'center' }}>
          <Loader2
            className="animate-spin mx-auto mb-4"
            style={{ width: 32, height: 32, color: '#C77DFF' }}
          />
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>Verificando enlace...</p>
        </div>
      </div>
    );
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
          Nueva contraseña
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>Introduce tu nueva contraseña</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Label htmlFor="password" style={labelStyle}>Nueva contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Label htmlFor="confirm-password" style={labelStyle}>Confirmar contraseña</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la contraseña"
              required
              minLength={6}
              style={inputStyle}
            />
          </div>
        </div>

        <Button type="submit" disabled={loading} style={primaryButtonStyle}>
          {loading ? 'Actualizando...' : 'Actualizar contraseña'}
        </Button>
      </form>
    </div>
  );
}
