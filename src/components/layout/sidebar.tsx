'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CreditsBadge } from './credits-badge';
import { useUser } from '@/hooks/use-user';
import {
  LayoutDashboard, Cpu, ClipboardList, Sparkles, MessageSquare,
  PenTool, FileText, Users, Radar, BookOpen, LayoutTemplate,
  CreditCard, ShieldCheck,
} from 'lucide-react';

export const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/analizador', label: 'Analizador', icon: Cpu },
  { href: '/auditorias', label: 'Auditorías', icon: ClipboardList },
  { href: '/agentes', label: 'Agentes IA', icon: Sparkles },
  { href: '/pipeline', label: 'Pipeline CRM', icon: Users },
  { href: '/propuestas', label: 'Propuestas', icon: FileText },
  { href: '/scripts', label: 'Scripts', icon: PenTool },
  { href: '/prospeccion', label: 'Prospección', icon: Radar },
  { href: '/nichos', label: 'Nichos', icon: BookOpen },
  { href: '/plantillas', label: 'Plantillas', icon: LayoutTemplate },
  { href: '/facturacion', label: 'Facturación', icon: CreditCard },
];

export const ADMIN_ITEMS = [
  { href: '/admin', label: 'Admin', icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: user } = useUser();

  const isAdmin = user?.rol === 'owner' || user?.rol === 'admin';

  return (
    <aside className="hidden md:flex flex-col h-screen w-64 border-r bg-card shrink-0">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <img src="/icon.svg" alt="AI Agency OS" className="h-6 w-6" />
          <h1 className="text-lg font-bold">AI Agency OS</h1>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="my-2 border-t" />
            {ADMIN_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="p-3 border-t">
        <CreditsBadge />
      </div>
    </aside>
  );
}
