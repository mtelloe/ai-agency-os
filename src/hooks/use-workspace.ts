'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Workspace } from '@/lib/types/database';

export function useWorkspace() {
  const supabase = createClient();

  return useQuery<Workspace>({
    queryKey: ['workspace'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('users_profile')
        .select('workspace_id')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error('No profile found');

      const { data: workspace, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', profile.workspace_id)
        .single();

      if (error) throw error;
      return workspace as Workspace;
    },
  });
}
