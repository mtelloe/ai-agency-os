import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import type { Propuesta } from '@/lib/types/database';

export default async function PropuestaPublicPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: propuesta } = await supabase
    .from('propuestas')
    .select('*, empresa:empresas(*)')
    .eq('share_token', token)
    .single<Propuesta & { empresa: { nombre: string; website: string | null } | null }>();

  if (!propuesta) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Propuesta no encontrada</CardTitle>
            <CardDescription>
              El enlace que has utilizado no es válido o la propuesta ya no está disponible.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardDescription className="text-xs uppercase tracking-wider font-medium">
                  Propuesta comercial
                </CardDescription>
                <CardTitle className="text-2xl mt-1">
                  {propuesta.titulo}
                </CardTitle>
                {propuesta.empresa && (
                  <p className="text-muted-foreground mt-1">
                    Preparada para {propuesta.empresa.nombre}
                  </p>
                )}
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>Versión {propuesta.version}</p>
                <p>{new Date(propuesta.created_at).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Resumen Ejecutivo */}
        {propuesta.resumen_ejecutivo && (
          <Card>
            <CardHeader>
              <CardTitle>Resumen Ejecutivo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {propuesta.resumen_ejecutivo}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Problemas detectados */}
        {propuesta.problemas && (
          <Card>
            <CardHeader>
              <CardTitle>Problemas Detectados</CardTitle>
              <CardDescription>
                Oportunidades de mejora identificadas en tu negocio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {propuesta.problemas}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Solución propuesta */}
        {propuesta.solucion && (
          <Card>
            <CardHeader>
              <CardTitle>Solución Propuesta</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {propuesta.solucion}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Metodología */}
        {propuesta.stack && (
          <Card>
            <CardHeader>
              <CardTitle>Metodología de trabajo</CardTitle>
              <CardDescription>
                Cómo trabajamos para garantizar resultados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {propuesta.stack}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Cronograma */}
        {propuesta.cronograma && (
          <Card>
            <CardHeader>
              <CardTitle>Cronograma de Implementación</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {propuesta.cronograma}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Pricing */}
        {(propuesta.precio_setup !== null || propuesta.precio_mensual !== null) && (
          <Card className="ring-primary/30 ring-2">
            <CardHeader>
              <CardTitle>Inversión</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {propuesta.precio_setup !== null && (
                  <div className="rounded-lg bg-muted/50 p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Setup inicial</p>
                    <p className="text-3xl font-bold">
                      {propuesta.precio_setup.toLocaleString('es-ES')} €
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Pago único</p>
                  </div>
                )}
                {propuesta.precio_mensual !== null && (
                  <div className="rounded-lg bg-muted/50 p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Mantenimiento mensual</p>
                    <p className="text-3xl font-bold">
                      {propuesta.precio_mensual.toLocaleString('es-ES')} €
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Recurrente</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ROI */}
        {propuesta.roi && (
          <Card>
            <CardHeader>
              <CardTitle>Retorno de la Inversión (ROI)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {propuesta.roi}
              </p>
            </CardContent>
          </Card>
        )}

        {/* CTA Cierre */}
        <Card className="bg-primary/5">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              {propuesta.cta_cierre || '¿Listo para transformar tu negocio con IA?'}
            </CardTitle>
            <CardDescription className="text-base">
              Hablemos sobre cómo podemos ayudarte a implementar esta solución
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <a
              href={`mailto:?subject=Interesado en la propuesta: ${encodeURIComponent(propuesta.titulo)}`}
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground h-9 px-4 text-sm font-medium transition-colors hover:bg-primary/80"
            >
              Contactar
            </a>
          </CardFooter>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground py-4">
          <p>Propuesta generada con AI Agency OS</p>
        </div>
      </div>
    </div>
  );
}
