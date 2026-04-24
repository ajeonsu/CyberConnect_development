'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserAccessRolesAction, loginAction, getSession } from '@/actions/auth';
import type { UserRole, UserProfile } from '@/types';
import { Shield, Briefcase, Code, Users, Loader, UserRound, ArrowLeft } from 'lucide-react';

const roleCards = [
  { role: 'admin', label: 'Administrator', labelJa: '管理者', desc: 'Monitor all projects across every PM. Global dashboard and full access.', icon: Shield, color: 'from-red-600 to-red-800' },
  { role: 'pm', label: 'Project Manager', labelJa: 'プロジェクトマネージャー', desc: 'Manage your own projects, create tasks, assign developers to work.', icon: Briefcase, color: 'from-brand-600 to-brand-800' },
  { role: 'dev', label: 'Developer', labelJa: '開発者', desc: 'Access tech stack, screen list, function list, and assigned tasks.', icon: Code, color: 'from-emerald-600 to-emerald-800' },
  { role: 'client', label: 'Client / Guest', labelJa: 'クライアント / ゲスト', desc: 'View all sheets, comment on task remarks only.', icon: Users, color: 'from-amber-600 to-amber-800' },
  { role: 'personal', label: 'Personal Space', labelJa: 'Personal Space', desc: 'Manage your personal projects and upgrade to a team plan.', icon: UserRound, color: 'from-indigo-600 to-indigo-800' },
];

function SwitchRoleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamSlug = searchParams.get('team');
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [accessRoles, setAccessRoles] = useState<{ isAdmin: boolean; projectRoles: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolvedTeamSlug, setResolvedTeamSlug] = useState<string | null>(teamSlug);
  const [returnDashboardPath, setReturnDashboardPath] = useState<string>('/select-workspace');

  useEffect(() => {
    const init = async () => {
      const session = await getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', session.email)
        .single();

      if (profileData) {
        setProfile(profileData as UserProfile);
        const targetSlug = teamSlug || session.activeTeamSlug;
        setResolvedTeamSlug(targetSlug || null);
        const dashboardPath =
          session.accountKind === 'personal' || session.activeWorkspaceRole === 'personal'
            ? '/personal/dashboard'
            : targetSlug && session.activeWorkspaceRole
              ? `/${targetSlug}/${session.activeWorkspaceRole}/dashboard`
              : '/select-workspace';
        setReturnDashboardPath(dashboardPath);
        const roles = await getUserAccessRolesAction(profileData.id, targetSlug || undefined);
        setAccessRoles(roles as any);
      }
      setLoading(false);
    };
    init();
  }, [teamSlug, router]);

  const availableRoles = useMemo(() => {
    if (!accessRoles) return [];
    
    // If we have a team slug (either from URL or session), we filter roles for that team
    // Otherwise, we might only show Personal Space
    return roleCards.filter(card => {
      // Personal Space is always an option unless we are strictly in a team context from URL
      if (card.role === 'personal') return !teamSlug;
      
      // If no team resolved, we can't show team roles
      if (!resolvedTeamSlug) return false;

      if (accessRoles.isAdmin) return true;
      if (card.role === 'admin') return false;
      return accessRoles.projectRoles.includes(card.role);
    });
  }, [accessRoles, teamSlug, resolvedTeamSlug]);

  const handleRoleSelect = async (role: string) => {
    if (!profile) return;
    const accountKind = role === 'personal' ? 'personal' : 'team';
    const finalTeamSlug = resolvedTeamSlug || 'my-team';

    // Update session cookies without logging out
    await loginAction(profile.email, profile.role, accountKind, role, accountKind === 'team' ? finalTeamSlug : undefined);
    
    if (role === 'personal') {
      router.push('/personal/dashboard');
    } else {
      router.push(`/${finalTeamSlug}/${role}/dashboard`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <Loader className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full animate-fade-in">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-white mb-2">Switch Perspective</h1>
          <p className="text-gray-400">
            {teamSlug ? `Select your role for ${teamSlug}` : 'Select a workspace and role'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableRoles.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.role}
                onClick={() => handleRoleSelect(card.role)}
                className="group relative text-left bg-surface-900 border border-surface-700 rounded-3xl p-6 transition-all hover:border-brand-500/50 hover:shadow-2xl hover:shadow-brand-500/10 hover:-translate-y-1"
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-6 shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-brand-300 transition-colors">
                  {card.label}
                  <span className="block text-xs text-gray-500 font-normal mt-1">{card.labelJa}</span>
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">{card.desc}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <button
            onClick={() => router.push(returnDashboardPath)}
            className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SwitchRolePage() {
  return (
    <Suspense fallback={null}>
      <SwitchRoleContent />
    </Suspense>
  );
}
