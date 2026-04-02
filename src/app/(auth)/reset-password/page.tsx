'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, RefreshCw } from 'lucide-react';

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
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Enlace no válido</CardTitle>
          <CardDescription className="mt-2">{sessionError}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Introduce tu email para recibir un nuevo enlace:
          </p>
          <Input
            type="email"
            placeholder="tu@email.com"
            value={resendEmail}
            onChange={(e) => setResendEmail(e.target.value)}
          />
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button className="w-full" onClick={handleResend} disabled={resending}>
            {resending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
            ) : (
              <><RefreshCw className="h-4 w-4 mr-2" /> Enviar nuevo enlace</>
            )}
          </Button>
          <Button variant="outline" className="w-full" onClick={() => router.push('/login')}>
            Volver al inicio de sesión
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!sessionReady) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Verificando enlace...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Nueva contraseña</CardTitle>
        <CardDescription>Introduce tu nueva contraseña</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nueva contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar contraseña</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la contraseña"
              required
              minLength={6}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar contraseña'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
