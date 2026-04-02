import { CheckCircle, TrendingUp } from 'lucide-react';

export default function ScoreGauge({ score, opportunities = [] }) {
  const getScoreColor = (s) => {
    if (s >= 75) return { text: 'text-green-600', bg: 'bg-green-500', label: 'Alta oportunidad', ring: '#22c55e' };
    if (s >= 50) return { text: 'text-yellow-600', bg: 'bg-yellow-500', label: 'Oportunidad media', ring: '#eab308' };
    return { text: 'text-red-600', bg: 'bg-red-500', label: 'Baja oportunidad', ring: '#ef4444' };
  };

  const colors = getScoreColor(score);
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl border border-slate-200 p-8 flex flex-col items-center">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-6">Score de Oportunidad</h3>
        <div className="relative w-40 h-40">
          <svg className="w-40 h-40 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#f1f5f9" strokeWidth="10" />
            <circle
              cx="60" cy="60" r="52"
              fill="none"
              stroke={colors.ring}
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold ${colors.text}`}>{score}</span>
            <span className="text-xs text-slate-400">/100</span>
          </div>
        </div>
        <span className={`mt-4 px-3 py-1 rounded-full text-sm font-medium ${colors.text} bg-opacity-10`}
          style={{ backgroundColor: `${colors.ring}20` }}>
          {colors.label}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-slate-700" />
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Oportunidades Detectadas</h3>
        </div>
        <div className="space-y-3">
          {opportunities.map((opp, i) => (
            <div key={i} className="flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-slate-700">{opp}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}