'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    // Supabase redirects with a code in the URL hash or query params
    // We need to exchange it for a session before we can update the password
    async function handleAuthCallback() {
      const code = searchParams.get('code');

      if (code) {
        // Exchange the code for a session
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setSessionError('El enlace ha caducado o ya se ha usado. Solicita uno nuevo.');
          return;
        }
      }

      // Check if we have a valid session (could come from hash fragment too)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
      } else {
        // Try listening for auth state change (hash fragment flow)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'PASSWORD_RECOVERY') {
            setSessionReady(true);
          }
        });

        // Give it a moment
        setTimeout(() => {
          subscription.unsubscribe();
          if (!sessionReady) {
            supabase.auth.getSession().then(({ data: { session: s } }) => {
              if (s) {
                setSessionReady(true);
              } else {
                setSessionError('El enlace ha caducado o ya se ha usado. Solicita uno nuevo.');
              }
            });
          }
        }, 3000);
      }
    }

    handleAuthCallback();
  }, []);

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
        toast.error(error.message === 'Auth session missing!'
          ? 'La sesión ha caducado. Solicita un nuevo enlace de recuperación.'
          : error.message);
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
          <CardTitle className="text-2xl">Enlace caducado</CardTitle>
          <CardDescription>{sessionError}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button className="w-full" onClick={() => router.push('/forgot-password')}>
            Solicitar nuevo enlace
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
