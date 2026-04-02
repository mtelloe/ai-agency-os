import { useState } from 'react';
import { Copy, Check, MessageSquare, AlertCircle, Lightbulb, DollarSign, Shield, Target } from 'lucide-react';

const sections = [
  { key: 'gancho_apertura', label: 'Gancho de Apertura', icon: MessageSquare, color: 'blue' },
  { key: 'problemas_especificos', label: 'Problemas Específicos', icon: AlertCircle, color: 'red' },
  { key: 'solucion_ia', label: 'Solución IA Propuesta', icon: Lightbulb, color: 'yellow' },
  { key: 'precio_argumento', label: 'Argumento de Precio', icon: DollarSign, color: 'green' },
  { key: 'cta_cierre', label: 'CTA de Cierre', icon: Target, color: 'violet' },
];

const colorMap = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', header: 'text-blue-800' },
  red: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', header: 'text-red-800' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-600', header: 'text-yellow-800' },
  green: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', header: 'text-green-800' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', icon: 'text-violet-600', header: 'text-violet-800' },
};

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="text-slate-400 hover:text-slate-700 transition-colors p-1">
      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

export default function SalesScript({ script, businessName }) {
  if (!script) return null;

  const fullScript = sections.map(s => `### ${s.label}\n${script[s.key] || ''}`).join('\n\n')
    + (script.manejo_objeciones?.length ? '\n\n### Manejo de Objeciones\n' + script.manejo_objeciones.map(o => `- Objeción: "${o.objecion}"\n  Respuesta: "${o.respuesta}"`).join('\n') : '');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Script de Ventas Personalizado</h3>
        <CopyButton text={fullScript} />
      </div>

      {sections.map(({ key, label, icon: Icon, color }) => {
        if (!script[key]) return null;
        const c = colorMap[color];
        return (
          <div key={key} className={`rounded-xl border p-5 ${c.bg} ${c.border}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${c.icon}`} />
                <span className={`text-sm font-semibold ${c.header}`}>{label}</span>
              </div>
              <CopyButton text={script[key]} />
            </div>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{script[key]}</p>
          </div>
        );
      })}

      {script.manejo_objeciones?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-semibold text-slate-700">Manejo de Objeciones</span>
          </div>
          <div className="space-y-4">
            {script.manejo_objeciones.map((item, i) => (
              <div key={i} className="grid md:grid-cols-2 gap-3">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">Objeción</p>
                  <p className="text-sm text-slate-700">"{item.objecion}"</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-green-700 mb-1">Tu respuesta</p>
                  <p className="text-sm text-slate-700">"{item.respuesta}"</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}