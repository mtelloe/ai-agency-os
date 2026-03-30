import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Cpu, Sparkles, Radar, FileText } from 'lucide-react';

const ACTIONS = [
  { href: '/analizador', label: 'Analizar web', description: 'Audita un negocio en segundos', icon: Cpu, color: 'text-blue-500' },
  { href: '/agentes/nuevo', label: 'Crear agente', description: 'Despliega un chatbot IA', icon: Sparkles, color: 'text-purple-500' },
  { href: '/prospeccion', label: 'Prospectar', description: 'Encuentra negocios por nicho', icon: Radar, color: 'text-green-500' },
  { href: '/propuestas', label: 'Propuestas', description: 'Genera propuestas comerciales', icon: FileText, color: 'text-orange-500' },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {ACTIONS.map((action) => (
        <Link key={action.href} href={action.href}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center ${action.color}`}>
                <action.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">{action.label}</p>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
