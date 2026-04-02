import { useState } from 'react';
import AnalyzerForm from '@/components/analizador/AnalyzerForm';
import AnalysisResults from '@/components/analizador/AnalysisResults';
import AnalysisHistory from '@/components/analizador/AnalysisHistory';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

export default function Analizador() {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [url, setUrl] = useState('');
  const [activeTab, setActiveTab] = useState('analizar');
  const { toast } = useToast();

  const handleAnalyze = async (inputUrl) => {
    setLoading(true);
    setUrl(inputUrl);
    setAnalysis(null);
    try {
      const response = await base44.functions.invoke('analyzeWebsite', { url: inputUrl });
      const data = response.data?.data;
      setAnalysis(data);

      // Save to Auditorias entity
      await base44.entities.Auditorias.create({
        url_analizada: inputUrl,
        estado: 'completada',
        resumen_negocio: data.descripcion,
        score_oportunidad: data.score_oportunidad,
        problemas_detectados: JSON.stringify(data.problemas_detectados),
        agentes_recomendados: JSON.stringify(data.agentes_recomendados),
        roi_estimado: String(data.ahorro_mensual_eur),
        pricing_sugerido: JSON.stringify({ setup: data.precio_sugerido_setup, mensual: data.precio_sugerido_mensual }),
        analysis_result: JSON.stringify(data),
        created_at: new Date().toISOString(),
      });

      toast({ title: 'Análisis completado', description: `${data.nombre_negocio} analizado y guardado en historial.` });
      setActiveTab('resultado');
    } catch (error) {
      toast({ title: 'Error en el análisis', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Analizador Web IA</h1>
        <p className="text-slate-500 mt-1">Analiza cualquier negocio y genera un informe completo con oportunidades de IA</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
        {[
          { key: 'analizar', label: 'Analizar URL' },
          { key: 'resultado', label: 'Resultado', disabled: !analysis },
          { key: 'historial', label: 'Historial' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => !tab.disabled && setActiveTab(tab.key)}
            disabled={tab.disabled}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'analizar' && (
        <AnalyzerForm onAnalyze={handleAnalyze} loading={loading} />
      )}
      {activeTab === 'resultado' && analysis && (
        <AnalysisResults analysis={analysis} url={url} />
      )}
      {activeTab === 'historial' && (
        <AnalysisHistory onSelect={(a) => { setAnalysis(a); setActiveTab('resultado'); }} />
      )}
    </div>
  );
}