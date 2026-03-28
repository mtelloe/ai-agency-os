'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [workspaceName, setWorkspaceName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSaveWorkspace = async () => {
    if (!workspaceName.trim()) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('workspace_id')
        .eq('id', user.id)
        .single();

      if (profile?.workspace_id) {
        await supabase
          .from('workspaces')
          .update({ nombre: workspaceName.trim() })
          .eq('id', profile.workspace_id);
      }

      setStep(3);
    } catch (error) {
      console.error('Error updating workspace:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-2 rounded-full transition-all duration-300 ${
              s === step
                ? 'w-10 bg-primary'
                : s < step
                  ? 'w-10 bg-primary/50'
                  : 'w-10 bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Step 1: Welcome */}
      {step === 1 && (
        <Card>
          <CardHeader className="text-center">
            <div className="text-4xl mb-4">🚀</div>
            <CardTitle className="text-2xl">
              Bienvenido a AI Agency OS
            </CardTitle>
            <CardDescription className="text-base">
              Tu plataforma autónoma para escalar tu agencia de IA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium">Audita un negocio</p>
                  <p className="text-sm text-muted-foreground">
                    Analiza cualquier web y descubre oportunidades de IA
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  2
                </div>
                <div>
                  <p className="font-medium">Genera tu propuesta</p>
                  <p className="text-sm text-muted-foreground">
                    Crea propuestas profesionales con un clic
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  3
                </div>
                <div>
                  <p className="font-medium">Cierra el cliente</p>
                  <p className="text-sm text-muted-foreground">
                    Envía la propuesta y gestiona todo el pipeline
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              size="lg"
              onClick={() => setStep(2)}
            >
              Empezar
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Workspace name */}
      {step === 2 && (
        <Card>
          <CardHeader className="text-center">
            <div className="text-4xl mb-4">🏢</div>
            <CardTitle className="text-2xl">
              ¿Cómo se llama tu agencia?
            </CardTitle>
            <CardDescription className="text-base">
              Puedes cambiarlo después en los ajustes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Ej: NexusAI Agency"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="h-10 text-base"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveWorkspace();
              }}
            />
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setStep(1)}
            >
              Atrás
            </Button>
            <Button
              className="flex-1"
              size="lg"
              onClick={handleSaveWorkspace}
              disabled={!workspaceName.trim() || loading}
            >
              {loading ? 'Guardando...' : 'Continuar'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 3: All set */}
      {step === 3 && (
        <Card>
          <CardHeader className="text-center">
            <div className="text-4xl mb-4">🎉</div>
            <CardTitle className="text-2xl">
              ¡Todo listo!
            </CardTitle>
            <CardDescription className="text-base">
              Tu workspace <span className="font-semibold text-foreground">{workspaceName}</span> está configurado
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-3 text-primary">
              <span className="text-2xl font-bold">3</span>
              <span className="text-sm">créditos gratis para empezar</span>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              size="lg"
              onClick={() => router.push('/analizador')}
            >
              Hacer mi primera auditoría
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
