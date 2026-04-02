import { useState } from 'react';
import ScoreGauge from './ScoreGauge';
import ProblemsSection from './ProblemsSection';
import AgentsSection from './AgentsSection';
import SalesScript from './SalesScript';
import { Download, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';

export default function AnalysisResults({ analysis, url }) {
  const [activeSection, setActiveSection] = useState('overview');

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Análisis IA de Negocio', 20, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(url, 20, 30);
    doc.text(new Date().toLocaleDateString('es-ES'), pageWidth - 20, 30, { align: 'right' });

    // Business info
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(analysis.nombre_negocio || 'Negocio analizado', 20, 55);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(analysis.tipo_negocio || '', 20, 63);

    // Description
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    const descLines = doc.splitTextToSize(analysis.descripcion || '', pageWidth - 40);
    doc.text(descLines, 20, 75);

    // Score
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Score de Oportunidad: ${analysis.score_oportunidad}/100`, 20, 95);

    // Savings
    doc.setFontSize(12);
    doc.text(`Ahorro estimado mensual: ${analysis.ahorro_mensual_eur?.toLocaleString('es-ES')}€/mes`, 20, 107);
    doc.text(`Setup sugerido: ${analysis.precio_sugerido_setup?.toLocaleString('es-ES')}€ | Mensual: ${analysis.precio_sugerido_mensual?.toLocaleString('es-ES')}€/mes`, 20, 117);

    // Problems
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Problemas Detectados', 20, 132);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    let y = 142;
    (analysis.problemas_detectados || []).forEach((p, i) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.text(`${i + 1}. ${p.titulo} [${p.severidad?.toUpperCase()}]`, 20, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      const lines = doc.splitTextToSize(p.descripcion || '', pageWidth - 40);
      y += 7;
      doc.text(lines, 25, y);
      y += lines.length * 5 + 6;
      doc.setTextColor(15, 23, 42);
    });

    // Agents
    doc.addPage();
    y = 20;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Agentes IA Recomendados', 20, y);
    y += 12;
    (analysis.agentes_recomendados || []).forEach((a, i) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`${i + 1}. ${a.nombre}`, 20, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      const lines = doc.splitTextToSize(a.descripcion || '', pageWidth - 40);
      doc.text(lines, 25, y);
      y += lines.length * 5 + 3;
      doc.setTextColor(34, 197, 94);
      doc.text(`ROI estimado: ${a.roi_estimado_mensual_eur?.toLocaleString('es-ES')}€/mes`, 25, y);
      y += 10;
      doc.setTextColor(15, 23, 42);
    });

    // Sales Script
    if (analysis.script_ventas) {
      doc.addPage();
      y = 20;
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Script de Ventas', 20, y);
      y += 12;
      const sections = [
        { label: 'Gancho de apertura', value: analysis.script_ventas.gancho_apertura },
        { label: 'Problemas específicos', value: analysis.script_ventas.problemas_especificos },
        { label: 'Solución IA propuesta', value: analysis.script_ventas.solucion_ia },
        { label: 'Argumento de precio', value: analysis.script_ventas.precio_argumento },
        { label: 'CTA de cierre', value: analysis.script_ventas.cta_cierre },
      ];
      sections.forEach(({ label, value }) => {
        if (!value) return;
        if (y > 260) { doc.addPage(); y = 20; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(label + ':', 20, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        const lines = doc.splitTextToSize(value, pageWidth - 40);
        doc.text(lines, 20, y);
        y += lines.length * 5 + 8;
      });
    }

    doc.save(`analisis-${analysis.nombre_negocio?.replace(/\s+/g, '-').toLowerCase() || 'negocio'}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const sections = [
    { key: 'overview', label: 'Resumen' },
    { key: 'problems', label: 'Problemas' },
    { key: 'agents', label: 'Agentes IA' },
    { key: 'script', label: 'Script de Ventas' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{analysis.nombre_negocio}</h2>
            <p className="text-sm text-slate-500 mt-1">{analysis.tipo_negocio} · {url}</p>
            <p className="text-slate-600 mt-2 max-w-2xl">{analysis.descripcion}</p>
          </div>
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-slate-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{analysis.ahorro_mensual_eur?.toLocaleString('es-ES')}€</p>
            <p className="text-xs text-slate-500 mt-1">Ahorro mensual estimado</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{analysis.precio_sugerido_setup?.toLocaleString('es-ES')}€</p>
            <p className="text-xs text-slate-500 mt-1">Setup sugerido</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{analysis.precio_sugerido_mensual?.toLocaleString('es-ES')}€/mes</p>
            <p className="text-xs text-slate-500 mt-1">Fee mensual sugerido</p>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {sections.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeSection === s.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {activeSection === 'overview' && <ScoreGauge score={analysis.score_oportunidad} opportunities={analysis.oportunidades} />}
      {activeSection === 'problems' && <ProblemsSection problems={analysis.problemas_detectados} />}
      {activeSection === 'agents' && <AgentsSection agents={analysis.agentes_recomendados} />}
      {activeSection === 'script' && <SalesScript script={analysis.script_ventas} businessName={analysis.nombre_negocio} />}
    </div>
  );
}