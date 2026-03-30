import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/top-bar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/landing');
  }

  // Check if onboarding is completed
  const { data: profile } = await supabase
    .from('users_profile')
    .select('workspace_id')
    .eq('id', user.id)
    .single();

  if (profile?.workspace_id) {
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('nombre')
      .eq('id', profile.workspace_id)
      .single();

    if (!workspace?.nombre || workspace.nombre === 'Mi Workspace') {
      redirect('/onboarding');
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
