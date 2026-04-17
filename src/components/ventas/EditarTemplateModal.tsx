'use client';

import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { saveTemplate } from '@/app/actions/ventas';
import type { EmailTemplateRow } from '@/lib/types/database';

const VARIABLES = ['{{nombre}}', '{{empresa}}', '{{cargo}}', '{{sector}}'];

interface Props {
  template: EmailTemplateRow | null;
  onClose: () => void;
  workspaceId: string;
}

export function EditarTemplateModal({ template, onClose, workspaceId }: Props) {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (template) {
      setSubject(template.subject);
      setBody(template.body_text);
    }
  }, [template]);

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

  async function handleSave() {
    if (!template) return;
    setSaving(true);
    try {
      const result = await saveTemplate({
        id: template.id,
        slug: template.slug,
        subject,
        body_text: body,
        workspace_id: workspaceId,
      });

      if (!result.success) {
        toast.error(result.error ?? 'Error al guardar template');
        return;
      }

      toast.success('Template guardado');
      queryClient.invalidateQueries({ queryKey: ['ventas-templates', workspaceId] });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!template} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar template</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs">Slug (identificador)</Label>
            <Input
              value={template?.slug ?? ''}
              disabled
              className="h-8 text-xs bg-muted"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Asunto</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Cuerpo</Label>
            <Textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="text-xs min-h-[140px] resize-none"
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
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
