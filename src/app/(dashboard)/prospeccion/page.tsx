'use client';

import { useState } from 'react';
import { useWorkspace } from '@/hooks/use-workspace';
import { useUser } from '@/hooks/use-user';
import { useAuthFetch } from '@/hooks/use-auth-fetch';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Radar, CheckCircle2, MapPin, Users } from 'lucide-react';
import { toast } from 'sonner';

const NICHOS = [
  'Restaurantes',
  'Clinicas dentales',
  'Inmobiliarias',
  'Centros de estetica',
  'Abogados',
  'Asesorias fiscales',
  'Gestorias',
  'Arquitectos',
  'Consultoras',
  'Administradores de fincas',
  'Agencias de marketing',
  'Empresas de construccion',
  'Gimnasios',
  'Autoescuelas',
  'Clinicas veterinarias',
  'Academias de idiomas',
  'Talleres mecanicos',
  'Peluquerias',
  'Fontaneros',
  'Electricistas',
  'Contables',
  'Fisioterapeutas',
];

export default function ProspeccionPage() {
  const { data: workspace, isLoading: wsLoading } = useWorkspace();
  const { data: user } = useUser();
  const { authFetch } = useAuthFetch();
  const queryClient = useQueryClient();

  const [nicho, setNicho] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [cantidad, setCantidad] = useState('5');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const creditos = wsLoading
    ? '...'
    : Math.max(0, (workspace?.creditos_total ?? 0) - (workspace?.creditos_usados ?? 0));

  async function handleProspect(e: React.FormEvent) {
    e.preventDefault();
    if (!workspace || !user || !nicho || !ciudad.trim()) return;

    setLoading(true);
    setDone(false);

    try {
      const res = await authFetch('/api/ai/prospect', {
        method: 'POST',
        body: JSON.stringify({
          nicho,
          ciudad: ciudad.trim(),
          cantidad: parseInt(cantidad),
          workspaceId: workspace.id,
          userId: user.id,
        }),
      });

      if (res.status === 402) {
        toast.error('No tienes creditos suficientes. Actualiza tu plan.');
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al prospectar');
      }

      const data = await res.json();

      if (data.async) {
        setDone(true);
        toast.success('Prospeccion iniciada. Los leads apareceran en el pipeline en 1-2 minutos con datos del decisor.');
      } else {
        setDone(true);
        toast.success(`${data.total} leads encontrados y anadidos al pipeline.`);
      }

      queryClient.invalidateQueries({ queryKey: ['workspace'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al prospectar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Prospección</h1>
        <p className="text-muted-foreground">
          Busca negocios reales en Google Maps y encuentra al decisor con email.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radar className="h-5 w-5 text-primary" />
            Nueva búsqueda
          </CardTitle>
          <CardDescription>
            Busca negocios reales y enriquece con datos del responsable via Hunter.io.
            Coste: 2 creditos. Tienes <strong>{creditos}</strong> creditos disponibles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProspect} className="space-y-4">
            <div className="space-y-2">
              <Label>Nicho</Label>
              <Select value={nicho} onValueChange={(v) => setNicho(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un nicho..." />
                </SelectTrigger>
                <SelectContent>
                  {NICHOS.map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ciudad</Label>
              <div className="relative">
                <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Barcelona, Madrid, Valencia..."
                  value={ciudad}
                  onChange={(e) => setCiudad(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cantidad de leads</Label>
              <Select value={cantidad} onValueChange={(v) => setCantidad(v ?? '5')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 leads</SelectItem>
                  <SelectItem value="5">5 leads</SelectItem>
                  <SelectItem value="10">10 leads</SelectItem>
                  <SelectItem value="15">15 leads</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !nicho || !ciudad.trim() || wsLoading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Buscando negocios...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Buscar leads
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
            <p className="font-medium">Buscando negocios en Google Maps...</p>
            <p className="text-sm text-muted-foreground mt-1">
              Esto puede tardar 1-2 minutos. Buscando {nicho} en {ciudad} y encontrando al decisor.
            </p>
          </CardContent>
        </Card>
      )}

      {done && !loading && (
        <Card className="border-green-200 dark:border-green-900">
          <CardContent className="p-6 flex items-start gap-4">
            <CheckCircle2 className="h-6 w-6 text-green-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Prospeccion en curso</p>
              <p className="text-sm text-muted-foreground mt-1">
                Los leads apareceran en el{' '}
                <a href="/pipeline" className="underline text-primary">Pipeline</a>
                {' '}en unos minutos con el email del responsable cuando este disponible.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
