import { useState } from 'react';
import { Globe, Search, Zap, Shield, TrendingUp, Clock } from 'lucide-react';

const features = [
  { icon: TrendingUp, label: 'Score de oportunidad IA (0-100)' },
  { icon: Shield, label: 'Problemas detectados con severidad' },
  { icon: Zap, label: 'Top 3 agentes IA recomendados + ROI' },
  { icon: Clock, label: 'Estimación de ahorro mensual en €' },
];

export default function AnalyzerForm({ onAnalyze, loading }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!url.trim()) { setError('Introduce una URL'); return; }
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http')) cleanUrl = 'https://' + cleanUrl;
    try { new URL(cleanUrl); } catch { setError('URL no válida'); return; }
    onAnalyze(cleanUrl);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Analiza cualquier web con IA</h2>
          <p className="text-slate-500">Introduce la URL del negocio y en segundos tendrás un análisis completo</p>
        </div>

        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://ejemplo.com"
                disabled={loading}
                className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:opacity-50 text-base"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-4 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analizando...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Analizar ahora
                </>
              )}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        </form>

        {loading && (
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="bg-slate-50 rounded-xl p-6">
              <p className="text-sm font-medium text-slate-700 mb-4 text-center">Analizando el negocio con IA...</p>
              <div className="space-y-3">
                {['Accediendo a la web...', 'Analizando contenido y estructura...', 'Detectando problemas y oportunidades...', 'Generando recomendaciones IA...'].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin flex-shrink-0" style={{ animationDelay: `${i * 0.2}s` }} />
                    <span className="text-sm text-slate-600">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {features.map(({ icon: Icon, label }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-slate-700" />
            </div>
            <span className="text-xs text-slate-600 font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}