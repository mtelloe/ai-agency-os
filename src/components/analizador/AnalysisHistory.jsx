import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Clock, Globe, TrendingUp, ChevronRight, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AnalysisHistory({ onSelect }) {
  const [auditorias, setAuditorias] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await base44.entities.Auditorias.list('-created_date', 50);
      setAuditorias(data);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (a) => {
    if (!a.analysis_result) return;
    try {
      const parsed = JSON.parse(a.analysis_result);
      onSelect(parsed);
    } catch {}
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    await base44.entities.Auditorias.delete(id);
    setAuditorias(prev => prev.filter(a => a.id !== id));
  };

  const getScoreColor = (score) => {
    if (score >= 75) return 'text-green-600 bg-green-50';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (auditorias.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <Globe className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="font-medium text-slate-900 mb-1">Sin análisis aún</h3>
        <p className="text-sm text-slate-500">Los análisis que realices aparecerán aquí</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
        <Clock className="w-4 h-4 text-slate-500" />
        <h3 className="font-semibold text-slate-900">Historial de Análisis</h3>
        <span className="ml-auto text-sm text-slate-500">{auditorias.length} análisis</span>
      </div>
      <div className="divide-y divide-slate-100">
        {auditorias.map(a => {
          const hasResult = !!a.analysis_result;
          return (
            <div
              key={a.id}
              onClick={() => hasResult && handleSelect(a)}
              className={`flex items-center gap-4 px-6 py-4 transition-colors ${hasResult ? 'hover:bg-slate-50 cursor-pointer' : 'opacity-60'}`}
            >
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Globe className="w-4 h-4 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 text-sm truncate">{a.url_analizada}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-slate-500">
                    {a.created_at ? format(new Date(a.created_at), "d MMM yyyy, HH:mm", { locale: es }) : 'Fecha desconocida'}
                  </span>
                  {a.resumen_negocio && (
                    <span className="text-xs text-slate-400 truncate max-w-xs hidden md:block">
                      {a.resumen_negocio.slice(0, 60)}...
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {a.score_oportunidad != null && (
                  <span className={`px-2 py-1 rounded-lg text-xs font-bold ${getScoreColor(a.score_oportunidad)}`}>
                    {a.score_oportunidad}/100
                  </span>
                )}
                <button
                  onClick={e => handleDelete(e, a.id)}
                  className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                {hasResult && <ChevronRight className="w-4 h-4 text-slate-400" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}