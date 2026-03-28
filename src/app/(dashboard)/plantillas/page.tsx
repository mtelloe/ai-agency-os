'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { PlantillaAutomatizacion, CategoriaPlantilla } from '@/lib/types/database';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/empty-state';
import { ListSkeleton } from '@/components/shared/loading-skeleton';
import { LayoutTemplate, Zap } from 'lucide-react';

const CATEGORIA_LABELS: Record<CategoriaPlantilla, string> = {
  captacion_leads: 'Captación de leads',
  seguimiento_clientes: 'Seguimiento',
  reactivacion_clientes: 'Reactivación',
  agente_whatsapp: 'WhatsApp',
  agente_voz: 'Voz',
  crm_pipeline: 'CRM / Pipeline',
  email_marketing: 'Email marketing',
};

function PlantillaCard({ plantilla }: { plantilla: PlantillaAutomatizacion }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{plantilla.nombre}</CardTitle>
        {plantilla.descripcion && (
          <CardDescription>{plantilla.descripcion}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Trigger */}
        {plantilla.trigger_desc && (
          <div className="flex items-start gap-2 rounded-md bg-muted/50 p-2.5">
            <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-500" />
            <span className="text-xs text-muted-foreground">{plantilla.trigger_desc}</span>
          </div>
        )}

        {/* Pasos */}
        {plantilla.pasos.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {plantilla.pasos.length} pasos
            </div>
            <ol className="space-y-1">
              {plantilla.pasos.map((paso) => (
                <li key={paso.orden} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                    {paso.orden}
                  </span>
                  <span className="leading-relaxed">
                    {paso.descripcion}
                    <span className="ml-1 text-[10px] text-muted-foreground/60">({paso.herramienta})</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Integraciones */}
        {plantilla.integraciones.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {plantilla.integraciones.map((integracion, i) => (
              <Badge key={i} variant="outline" className="text-[11px]">
                {integracion}
              </Badge>
            ))}
          </div>
        )}

        {/* Nicho badge */}
        {plantilla.nicho && (
          <div className="pt-1">
            <Badge variant="secondary" className="text-[11px]">
              {plantilla.nicho}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PlantillasPage() {
  const supabase = createClient();

  const { data: plantillas, isLoading } = useQuery<PlantillaAutomatizacion[]>({
    queryKey: ['plantillas_automatizacion'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plantillas_automatizacion')
        .select('*')
        .order('categoria', { ascending: true })
        .order('nombre', { ascending: true });
      if (error) throw error;
      return data as PlantillaAutomatizacion[];
    },
  });

  const categorias = useMemo(() => {
    if (!plantillas) return [];
    const cats = [...new Set(plantillas.map((p) => p.categoria))];
    return cats.sort();
  }, [plantillas]);

  const grouped = useMemo(() => {
    if (!plantillas) return {};
    return plantillas.reduce<Record<string, PlantillaAutomatizacion[]>>((acc, p) => {
      if (!acc[p.categoria]) acc[p.categoria] = [];
      acc[p.categoria].push(p);
      return acc;
    }, {});
  }, [plantillas]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Plantillas de automatización</h1>
        <p className="text-muted-foreground">
          Workflows reutilizables para implementar en tus clientes
        </p>
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : !plantillas || plantillas.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          title="No hay plantillas"
          description="Aún no hay plantillas de automatización configuradas"
        />
      ) : (
        <Tabs defaultValue={categorias[0] || 'captacion_leads'}>
          <TabsList className="flex-wrap h-auto">
            {categorias.map((cat) => (
              <TabsTrigger key={cat} value={cat}>
                {CATEGORIA_LABELS[cat as CategoriaPlantilla] || cat}
                <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1.5">
                  {grouped[cat]?.length || 0}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {categorias.map((cat) => (
            <TabsContent key={cat} value={cat} className="mt-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {grouped[cat]?.map((plantilla) => (
                  <PlantillaCard key={plantilla.id} plantilla={plantilla} />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
