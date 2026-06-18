'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Copy, Check, Users, MessageSquare, Star, Megaphone, BookOpen, HelpCircle, EyeOff, RefreshCw } from 'lucide-react';

const sqt = createClient(
  process.env.NEXT_PUBLIC_SQT_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SQT_SUPABASE_ANON_KEY!
);

type Mensaje = {
  id: string;
  sent_at: string;
  sender_phone: string;
  sender_name: string;
  type: string;
  raw_content: string;
  transcription: string | null;
  ai_description: string | null;
  tags: string[];
  sentiment: string;
  categoria: string | null;
};

const CATEGORIAS = [
  { key: 'testimonio',  label: 'Testimonio',  icon: Star,          color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300' },
  { key: 'para-redes',  label: 'Para redes',  icon: Megaphone,     color: 'bg-pink-100 text-pink-700 hover:bg-pink-200 dark:bg-pink-900/30 dark:text-pink-300' },
  { key: 'formativo',   label: 'Formativo',   icon: BookOpen,      color: 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300' },
  { key: 'consulta',    label: 'Consulta',    icon: HelpCircle,    color: 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300' },
  { key: 'ignorar',     label: 'Ignorar',     icon: EyeOff,        color: 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400' },
] as const;

const FILTROS = [
  { key: 'todos',       label: 'Todos' },
  { key: 'sin-clasificar', label: 'Sin clasificar' },
  { key: 'testimonio',  label: 'Testimonios' },
  { key: 'para-redes',  label: 'Para redes' },
  { key: 'formativo',   label: 'Formativos' },
  { key: 'consulta',    label: 'Consultas' },
] as const;

const SENTIMENT_BADGE: Record<string, string> = {
  positive: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  negative: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  neutral:  'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

function MensajeCard({
  msg,
  onCategoria,
  saving,
}: {
  msg: Mensaje;
  onCategoria: (id: string, cat: string | null) => void;
  saving: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const texto = msg.raw_content || msg.transcription || msg.ai_description || '(sin texto)';
  const fecha = new Date(msg.sent_at).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  function copiar() {
    navigator.clipboard.writeText(texto);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const catActual = CATEGORIAS.find(c => c.key === msg.categoria);

  return (
    <div className={cn(
      'rounded-lg border bg-card shadow-sm transition-all',
      msg.categoria === 'ignorar' && 'opacity-50',
      saving && 'pointer-events-none opacity-60'
    )}>
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{msg.sender_name || msg.sender_phone}</p>
            <p className="text-xs text-muted-foreground">{fecha}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {msg.sentiment && msg.sentiment !== 'neutral' && (
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', SENTIMENT_BADGE[msg.sentiment])}>
                {msg.sentiment === 'positive' ? '😊' : '😞'} {msg.sentiment}
              </span>
            )}
            {catActual && (
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1', catActual.color.replace('hover:bg-yellow-200', '').replace('hover:bg-pink-200', '').replace('hover:bg-blue-200', '').replace('hover:bg-purple-200', '').replace('hover:bg-gray-200', ''))}>
                <catActual.icon className="h-2.5 w-2.5" />
                {catActual.label}
              </span>
            )}
          </div>
        </div>

        {/* Texto */}
        <div className="relative group">
          <p className="text-sm text-foreground/90 leading-relaxed line-clamp-4">{texto}</p>
          <button
            onClick={copiar}
            className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-muted hover:bg-muted/80"
            title="Copiar texto"
          >
            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>

        {/* Botones categoría */}
        <div className="flex flex-wrap gap-1.5 pt-1 border-t">
          {CATEGORIAS.map((cat) => {
            const Icon = cat.icon;
            const isActive = msg.categoria === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => onCategoria(msg.id, isActive ? null : cat.key)}
                className={cn(
                  'flex items-center gap-1 text-[11px] px-2 py-1 rounded-full font-medium transition-all',
                  isActive
                    ? cat.color + ' ring-2 ring-offset-1 ring-current'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                )}
              >
                <Icon className="h-3 w-3" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function SqtComunidadPage() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<string>('sin-clasificar');
  const [savingId, setSavingId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await sqt
      .from('sqt_messages')
      .select('id,sent_at,sender_phone,sender_name,type,raw_content,transcription,ai_description,tags,sentiment,categoria')
      .order('sent_at', { ascending: false })
      .limit(300);
    if (error) { toast.error('Error cargando mensajes'); }
    else setMensajes((data as Mensaje[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function setCategoria(id: string, categoria: string | null) {
    setSavingId(id);
    const { error } = await sqt
      .from('sqt_messages')
      .update({ categoria })
      .eq('id', id);
    if (error) {
      toast.error('Error al guardar');
    } else {
      setMensajes(prev => prev.map(m => m.id === id ? { ...m, categoria } : m));
    }
    setSavingId(null);
  }

  const filtrados = mensajes.filter(m => {
    if (filtro === 'todos') return true;
    if (filtro === 'sin-clasificar') return !m.categoria || m.categoria === null;
    return m.categoria === filtro;
  }).filter(m => filtro !== 'todos' || m.categoria !== 'ignorar');

  const stats = {
    total: mensajes.length,
    sinClasificar: mensajes.filter(m => !m.categoria).length,
    testimonios: mensajes.filter(m => m.categoria === 'testimonio').length,
    paraRedes: mensajes.filter(m => m.categoria === 'para-redes').length,
    formativos: mensajes.filter(m => m.categoria === 'formativo').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Comunidad SQT</h1>
          <p className="text-muted-foreground text-sm">
            Mensajes del grupo WhatsApp — clasifica para redes, contenido y testimonios
          </p>
        </div>
        <button
          onClick={cargar}
          className="flex items-center gap-2 text-sm px-3 py-2 rounded-md bg-muted hover:bg-muted/70 transition-colors"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total mensajes', value: stats.total, icon: MessageSquare, color: 'text-foreground' },
          { label: 'Sin clasificar', value: stats.sinClasificar, icon: Users, color: 'text-orange-500' },
          { label: 'Testimonios', value: stats.testimonios, icon: Star, color: 'text-yellow-500' },
          { label: 'Para redes', value: stats.paraRedes, icon: Megaphone, color: 'text-pink-500' },
          { label: 'Formativos', value: stats.formativos, icon: BookOpen, color: 'text-blue-500' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border bg-card p-3 flex items-center gap-3">
            <s.icon className={cn('h-5 w-5 shrink-0', s.color)} />
            <div>
              <p className="text-lg font-bold leading-none">{s.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {FILTROS.map(f => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={cn(
              'text-sm px-3 py-1.5 rounded-full font-medium transition-colors',
              filtro === f.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            {f.label}
            {f.key === 'sin-clasificar' && stats.sinClasificar > 0 && (
              <span className="ml-1.5 bg-orange-500 text-white text-[10px] rounded-full px-1.5 py-0.5">
                {stats.sinClasificar}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista mensajes */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay mensajes en este filtro</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map(msg => (
            <MensajeCard
              key={msg.id}
              msg={msg}
              onCategoria={setCategoria}
              saving={savingId === msg.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
