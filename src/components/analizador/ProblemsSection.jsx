import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

const severityConfig = {
  alta: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700', label: 'Alta' },
  media: { icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700', label: 'Media' },
  baja: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', label: 'Baja' },
};

export default function ProblemsSection({ problems = [] }) {
  const sorted = [...problems].sort((a, b) => {
    const order = { alta: 0, media: 1, baja: 2 };
    return (order[a.severidad] ?? 3) - (order[b.severidad] ?? 3);
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-5">
        Problemas Detectados ({problems.length})
      </h3>
      <div className="space-y-4">
        {sorted.map((problem, i) => {
          const cfg = severityConfig[problem.severidad] || severityConfig.baja;
          const Icon = cfg.icon;
          return (
            <div key={i} className={`flex gap-4 p-4 rounded-lg border ${cfg.bg} ${cfg.border}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-white`}>
                <Icon className={`w-4 h-4 ${cfg.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-slate-900 text-sm">{problem.titulo}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                </div>
                <p className="text-sm text-slate-600">{problem.descripcion}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}