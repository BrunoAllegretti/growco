import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, resetMobileDbCache } from "@/lib/mobile-db";
import { useQueryClient } from '@tanstack/react-query';

type CompanyRole = "owner" | "employee";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  companyId: string | null;
  companyRole: CompanyRole | null;
  isOwner: boolean;
  /** alias for isOwner — kept for backwards compatibility */
  isAdmin: boolean;
  loading: boolean;
  refreshCompany: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyRole, setCompanyRole] = useState<CompanyRole | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMembership = async (uid: string) => {
    const { data } = await supabase
      .from("company_members")
      .select("company_id, role")
      .eq("user_id", uid)
      .order("joined_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    setCompanyId(data?.company_id ?? null);
    setCompanyRole((data?.role as CompanyRole) ?? null);
    resetMobileDbCache();
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const uid = s.user.id;
        setTimeout(() => { loadMembership(uid); }, 0);
      } else {
        setCompanyId(null);
        setCompanyRole(null);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        await loadMembership(s.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!companyId || !user) return;
    const refreshAll = () => { resetMobileDbCache(); queryClient.invalidateQueries(); };
    const channel = supabase.channel(`growco-site-${companyId}-${user.id}`)
      .on('postgres_changes', { schema: 'public', table: 'records', event: '*', filter: `company_id=eq.${companyId}` }, refreshAll)
      .on('postgres_changes', { schema: 'public', table: 'company_members', event: '*', filter: `company_id=eq.${companyId}` }, () => {
        refreshAll(); loadMembership(user.id);
      })
      .subscribe();
    const timer = setInterval(refreshAll, 30000);
    const focus = () => refreshAll();
    window.addEventListener('focus', focus);
    return () => { supabase.removeChannel(channel); clearInterval(timer); window.removeEventListener('focus', focus); };
  }, [companyId, user?.id, queryClient]);

  const signOut = async () => {
    await supabase.auth.signOut();
    resetMobileDbCache();
    queryClient.clear();
  };

  const refreshCompany = async () => {
    if (user) await loadMembership(user.id);
  };

  const isOwner = companyRole === "owner";

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        companyId,
        companyRole,
        isOwner,
        isAdmin: isOwner,
        loading,
        refreshCompany,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}