'use client';

import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { launchCampaign } from '@/app/actions/ventas';
import type { EmailTemplateRow } from '@/lib/types/database';

const INDUSTRIES = [
  'wellness', 'fitness', 'healthcare', 'education', 'beauty',
  'restaurants', 'real estate', 'technology', 'consulting',
];

const VARIABLES = ['{{nombre}}', '{{empresa}}', '{{cargo}}'];

const EXAMPLE_VALUES: Record<string, string> = {
  '{{nombre}}': 'María',
  '{{empresa}}': 'Simedalavida',
  '{{cargo}}': 'Directora',
};

interface Props {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
}

export function NuevaCampanaModal({ open, onClose, workspaceId }: Props) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [industry, setIndustry] = useState('wellness');
  const [cargo, setCargo] = useState('director');
  const [region, setRegion] = useState('España');
  const [numLeads, setNumLeads] = useState(5);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [launching, setLaunching] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const { data: templates } = useQuery<EmailTemplateRow[]>({
    queryKey: ['ventas-templates', workspaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from('email_templates')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('active', true)
        .order('name');
      return (data ?? []) as EmailTemplateRow[];
    },
  });

  function handleSelectTemplate(slug: string) {
    setSelectedSlug(slug);
    const tpl = templates?.find((t) => t.slug === slug);
    if (tpl) {
      setSubject(tpl.subject);
      setBody(tpl.body_text);
    }
  }

  function insertVariable(v: string) {
    const el = bodyRef.current;
    if (!el) return;
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + v + body.slice(end);
    setBody(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + v.length, start + v.length);
    }, 0);
  }

  function getPreview() {
    let s = subject;
    let b = body;
    for (const [k, val] of Object.entries(EXAMPLE_VALUES)) {
      s = s.replaceAll(k, val);
      b = b.replaceAll(k, val);
    }
    return { s, b };
  }

  async function handleLaunch() {
    if (!subject.trim() || !body.trim()) {
      toast.error('Completa el asunto y el cuerpo del email');
      return;
    }
    const slug = selectedSlug || `campana-${Date.now()}`;
    setLaunching(true);
    try {
      const result = await launchCampaign({
        templateSlug: slug,
        subject,
        body,
        workspaceId,
        searchCriteria: {
          q_organization_industries: [industry],
          person_titles: [cargo],
          person_locations: [region],
          per_page: numLeads,
        },
      });

      if (!result.success) {
        toast.error(result.error ?? 'Error al lanzar campaña');
        return;
      }

      toast.success('Campaña lanzada correctamente');
      queryClient.invalidateQueries({ queryKey: ['ventas-kpis', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['ventas-activity', workspaceId] });
      onClose();
    } finally {
      setLaunching(false);
    }
  }

  const preview = getPreview();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva campaña</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Criterios Apollo */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Criterios de búsqueda
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Sector</Label>
                <Select value={industry} onValueChange={(v) => v && setIndustry(v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((i) => (
                      <SelectItem key={i} value={i} className="text-xs">
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cargo objetivo</Label>
                <Input
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  className="h-8 text-xs"
                  placeholder="director, gerente..."
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Región</Label>
                <Input
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="h-8 text-xs"
                  placeholder="Madrid, España..."
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nº leads (1-25)</Label>
                <Input
                  type="number"
                  min={1}
                  max={25}
                  value={numLeads}
                  onChange={(e) =>
                    setNumLeads(Math.min(25, Math.max(1, parseInt(e.target.value) || 1)))
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Email */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Email
            </p>
            <div className="space-y-3">
              {templates && templates.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs">Usar template existente</Label>
                  <Select value={selectedSlug} onValueChange={(v) => v && handleSelectTemplate(v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Seleccionar template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.slug} value={t.slug} className="text-xs">
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs">Asunto</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="h-8 text-xs"
                  placeholder="Asunto del email..."
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">
                  Cuerpo{' '}
                  <span className="text-muted-foreground">({body.length} caracteres)</span>
                </Label>
                <Textarea
                  ref={bodyRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="text-xs min-h-[120px] resize-none"
                  placeholder="Escribe el cuerpo del email..."
                />
                <div className="flex gap-1 flex-wrap">
                  {VARIABLES.map((v) => (
                    <Badge
                      key={v}
                      variant="outline"
                      className="text-xs cursor-pointer hover:bg-muted"
                      style={{ borderColor: '#8ac47a', color: '#5a8c4a' }}
                      onClick={() => insertVariable(v)}
                    >
                      {v}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Preview colapsable */}
              <button
                type="button"
                className="text-xs text-muted-foreground underline"
                onClick={() => setPreviewOpen((v) => !v)}
              >
                {previewOpen ? 'Ocultar preview' : 'Ver preview'}
              </button>
              {previewOpen && (
                <div className="glass rounded-lg p-3 text-xs space-y-1">
                  <p className="font-medium">{preview.s || '(sin asunto)'}</p>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {preview.b || '(sin cuerpo)'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={launching}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleLaunch}
            disabled={launching}
            className="btn-gradient"
          >
            {launching ? 'Lanzando...' : '▶ Lanzar campaña'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
