'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet';
import { LogOut, Plus, Settings, Menu } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { NAV_ITEMS, ADMIN_ITEMS } from './sidebar';
import { CreditsBadge } from './credits-badge';

export function TopBar() {
  const { data: user } = useUser();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const supabase = createClient();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isAdmin = user?.rol === 'owner' || user?.rol === 'admin';

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const initials = user?.nombre
    ? user.nombre.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <header
      className="h-14 flex items-center justify-between px-4 md:px-6 shrink-0"
      style={{
        background: 'rgba(8,6,15,0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Left side: hamburger on mobile */}
      <div className="flex items-center">
        <button
          onClick={() => setSheetOpen(true)}
          className="md:hidden inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Nueva auditoría: full on md+, icon-only on mobile */}
        <Link
          href="/analizador"
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-sm font-medium transition-colors"
          style={{
            background: 'var(--gl-accent-grad)',
            color: '#fff',
            boxShadow: '0 0 16px rgba(199,125,255,0.25)',
          }}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden md:inline">Nueva auditoría</span>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger className="relative h-8 w-8 rounded-full hover:bg-muted transition-colors flex items-center justify-center">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.nombre}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push('/facturacion')}>
              <Settings className="h-4 w-4 mr-2" />Facturación
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile navigation sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col" style={{
          background: 'rgba(8,6,15,0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255,255,255,0.07)',
        }}>
          <SheetHeader className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <SheetTitle style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              color: '#fff',
            }}>
              <span style={{
                background: 'var(--gl-accent-grad)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>AI</span> Agency OS
            </SheetTitle>
          </SheetHeader>

          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSheetOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                    isActive
                      ? 'text-[#C77DFF] bg-[rgba(199,125,255,0.12)] border-l-2 border-[#C77DFF]'
                      : 'text-[rgba(255,255,255,0.45)] border-l-2 border-transparent hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}

            {isAdmin && (
              <>
                <div className="my-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />
                {ADMIN_ITEMS.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSheetOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                        isActive
                          ? 'text-[#C77DFF] bg-[rgba(199,125,255,0.12)] border-l-2 border-[#C77DFF]'
                          : 'text-[rgba(255,255,255,0.45)] border-l-2 border-transparent hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
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

          <SheetFooter className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <CreditsBadge />
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </header>
  );
}
