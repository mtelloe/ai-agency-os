import { Bot, TrendingUp } from 'lucide-react';

const agentColors = [
  { bg: 'bg-violet-50', border: 'border-violet-200', icon: 'bg-violet-100 text-violet-700', badge: 'bg-violet-100 text-violet-700' },
  { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-100 text-blue-700', badge: 'bg-blue-100 text-blue-700' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'bg-emerald-100 text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
];

export default function AgentsSection({ agents = [] }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-5">
          Top 3 Agentes IA Recomendados
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          {agents.slice(0, 3).map((agent, i) => {
            const c = agentColors[i] || agentColors[0];
            return (
              <div key={i} className={`rounded-xl border p-5 ${c.bg} ${c.border}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.icon}`}>
                    <Bot className="w-5 h-5" />
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${c.badge}`}>
                    #{i + 1}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 mb-1">{agent.nombre}</h4>
                <p className="text-xs text-slate-500 mb-3">{agent.tipo}</p>
                <p className="text-sm text-slate-700 mb-4">{agent.descripcion}</p>
                <div className="pt-3 border-t border-white/60">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-xs text-slate-500">ROI estimado:</span>
                  </div>
                  <p className="text-lg font-bold text-green-600 mt-0.5">
                    {agent.roi_estimado_mensual_eur?.toLocaleString('es-ES')}€/mes
                  </p>
                  {agent.casos_uso && (
                    <p className="text-xs text-slate-500 mt-2 italic">{agent.casos_uso}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}