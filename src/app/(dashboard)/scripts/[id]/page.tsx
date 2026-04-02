'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuthFetch } from '@/hooks/use-auth-fetch';
import type { Script } from '@/lib/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ListSkeleton } from '@/components/shared/loading-skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { ArrowLeft, Copy, Mail, Phone, MessageCircle, RotateCcw, Presentation, ShieldQuestion, Send, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

type EmailType = 'cold_email' | 'follow_up';

function ScriptCard({
  title,
  icon: Icon,
  content,
  emailType,
  empresaEmail,
  onSend,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  content: string | null;
  emailType?: EmailType;
  empresaEmail?: string | null;
  onSend?: (type: EmailType, defaultEmail: string) => void;
}) {
  if (!content) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
        <div className="flex items-center gap-1">
          {emailType && onSend && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onSend(emailType, empresaEmail || '')}
              title="Enviar por email"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => { navigator.clipboard.writeText(content); toast.success('Copiado'); }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm whitespace-pre-wrap">{content}</p>
      </CardContent>
    </Card>
  );
}

export default function ScriptDetailPage() {
  const { id } = useParams() as { [key: string]: string };
  const supabase = createClient();
  const { authFetch } = useAuthFetch();

  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendEmailTo, setSendEmailTo] = useState('');
  const [sendEmailType, setSendEmailType] = useState<EmailType>('cold_email');
  const [sending, setSending] = useState(false);

  const { data: script, isLoading } = useQuery<Script>({
    queryKey: ['script', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scripts')
        .select('*, empresas(nombre, email)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Script;
    },
  });

  function openSendDialog(type: EmailType, defaultEmail: string) {
    setSendEmailType(type);
    setSendEmailTo(defaultEmail);
    setSendDialogOpen(true);
  }

  async function handleSendEmail() {
    if (!sendEmailTo || !script) return;

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('users_profile')
        .select('workspace_id')
        .eq('id', user?.id)
        .single();

      const res = await authFetch('/api/email/send', {
        method: 'POST',
        body: JSON.stringify({
          to: sendEmailTo,
          scriptId: script.id,
          type: sendEmailType,
          workspaceId: profile?.workspace_id,
          userId: user?.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Error al enviar el email');
        return;
      }

      toast.success('Email enviado correctamente');
      setSendDialogOpen(false);
    } catch {
      toast.error('Error al enviar el email');
    } finally {
      setSending(false);
    }
  }

  if (isLoading) return <ListSkeleton rows={6} />;
  if (!script) return <p>Scripts no encontrados</p>;

  const scriptWithEmpresa = script as Script & { empresas?: { nombre: string; email?: string | null } };
  const empresaEmail = scriptWithEmpresa.empresas?.email || null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/scripts">
          <Button variant="ghost" size="icon-sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Scripts de venta</h1>
          <p className="text-sm text-muted-foreground">
            {scriptWithEmpresa.empresas?.nombre || 'Empresa'}
          </p>
        </div>
      </div>

      <ScriptCard
        title="Cold Email"
        icon={Mail}
        content={script.cold_email}
        emailType="cold_email"
        empresaEmail={empresaEmail}
        onSend={openSendDialog}
      />
      <ScriptCard title="Guion de llamada" icon={Phone} content={script.script_llamada} />
      <ScriptCard title="Mensaje WhatsApp" icon={MessageCircle} content={script.mensaje_whatsapp} />
      <ScriptCard
        title="Follow-up (3 dias)"
        icon={RotateCcw}
        content={script.follow_up}
        emailType="follow_up"
        empresaEmail={empresaEmail}
        onSend={openSendDialog}
      />
      <ScriptCard title="Pitch de demo" icon={Presentation} content={script.pitch_demo} />

      {script.objeciones?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldQuestion className="h-4 w-4" />
              Objeciones frecuentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {script.objeciones.map((o, i) => (
              <div key={i}>
                <p className="text-sm font-medium text-destructive">&quot;{o.objecion}&quot;</p>
                <p className="text-sm text-muted-foreground mt-1">{o.respuesta}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Send Email Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar email</DialogTitle>
            <DialogDescription>
              {sendEmailType === 'cold_email'
                ? 'Envia el cold email generado al contacto de la empresa.'
                : 'Envia el follow-up al contacto de la empresa.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email-to">
              Email del destinatario
            </label>
            <Input
              id="email-to"
              type="email"
              placeholder="email@empresa.com"
              value={sendEmailTo}
              onChange={(e) => setSendEmailTo(e.target.value)}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button
              onClick={handleSendEmail}
              disabled={!sendEmailTo || sending}
            >
              {sending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              <Send className="h-4 w-4 mr-1" />
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
