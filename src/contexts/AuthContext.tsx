import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  isSupabaseConfigured,
  supabase,
  type AppRole,
  type OrganizationMembership,
  type OrganizationSummary,
  type UserProfile,
} from "@/lib/supabase";

interface SignUpPayload {
  email: string;
  password: string;
  fullName: string;
  organizationMode: "existing" | "new";
  organizationId?: string;
  requestedOrganizationName?: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  role: AppRole | null;
  isSystemAdmin: boolean;
  currentOrganizationRole: Exclude<AppRole, "system_admin"> | null;
  memberships: OrganizationMembership[];
  organizationOptions: OrganizationSummary[];
  currentOrganization: OrganizationSummary | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (payload: SignUpPayload) => Promise<{ error?: string; message?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshMemberships: () => Promise<void>;
  setCurrentOrganization: (organizationId: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchProfile(user: User | null): Promise<UserProfile | null> {
  if (!supabase || !user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, current_organization_id, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load profile", error);
    return {
      id: user.id,
      email: user.email ?? null,
      full_name: user.user_metadata?.full_name ?? null,
      role: "user",
      current_organization_id: null,
    };
  }

  if (!data) {
    return {
      id: user.id,
      email: user.email ?? null,
      full_name: user.user_metadata?.full_name ?? null,
      role: "user",
      current_organization_id: null,
    };
  }

  return data as UserProfile;
}

async function fetchMemberships(user: User | null): Promise<OrganizationMembership[]> {
  if (!supabase || !user) return [];

  const { data, error } = await supabase
    .from("organization_members")
    .select("id, organization_id, role, status, organizations(id, name, code, organization_type)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error || !data) {
    console.error("Failed to load memberships", error);
    return [];
  }

  return data
    .map((item: any) => ({
      id: item.id,
      organization_id: item.organization_id,
      role: item.role,
      status: item.status,
      organization: Array.isArray(item.organizations) ? item.organizations[0] : item.organizations,
    }))
    .filter((item) => item.organization) as OrganizationMembership[];
}

async function fetchOrganizationOptions(
  user: User | null,
  profile: UserProfile | null,
  memberships: OrganizationMembership[]
): Promise<OrganizationSummary[]> {
  if (!supabase || !user) return [];

  if (profile?.role === "system_admin") {
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name, code, organization_type")
      .order("name", { ascending: true });

    if (error || !data) {
      console.error("Failed to load organization options", error);
      return [];
    }

    return data as OrganizationSummary[];
  }

  return memberships.map((membership) => membership.organization);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([]);
  const [organizationOptions, setOrganizationOptions] = useState<OrganizationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const currentOrganization =
    organizationOptions.find((organization) => organization.id === profile?.current_organization_id) ??
    organizationOptions[0] ??
    null;

  const currentMembership =
    memberships.find((membership) => membership.organization_id === currentOrganization?.id) ?? null;

  const isSystemAdmin = profile?.role === "system_admin";
  const currentOrganizationRole = (currentMembership?.role ?? null) as Exclude<AppRole, "system_admin"> | null;

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    const initialize = async () => {
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();

      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      const nextProfile = await fetchProfile(initialSession?.user ?? null);
      const nextMemberships = await fetchMemberships(initialSession?.user ?? null);
      const nextOrganizationOptions = await fetchOrganizationOptions(
        initialSession?.user ?? null,
        nextProfile,
        nextMemberships
      );
      setProfile(nextProfile);
      setMemberships(nextMemberships);
      setOrganizationOptions(nextOrganizationOptions);
      setLoading(false);
    };

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      void (async () => {
        const nextProfile = await fetchProfile(nextSession?.user ?? null);
        const nextMemberships = await fetchMemberships(nextSession?.user ?? null);
        const nextOrganizationOptions = await fetchOrganizationOptions(nextSession?.user ?? null, nextProfile, nextMemberships);
        setProfile(nextProfile);
        setMemberships(nextMemberships);
        setOrganizationOptions(nextOrganizationOptions);
        setLoading(false);
      })();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    const nextProfile = await fetchProfile(user);
    setProfile(nextProfile);
    setOrganizationOptions(await fetchOrganizationOptions(user, nextProfile, memberships));
  };

  const refreshMemberships = async () => {
    const nextMemberships = await fetchMemberships(user);
    setMemberships(nextMemberships);
    setOrganizationOptions(await fetchOrganizationOptions(user, profile, nextMemberships));
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: "Supabase가 설정되지 않았습니다." };

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  };

  const signUp = async ({
    email,
    password,
    fullName,
    organizationMode,
    organizationId,
    requestedOrganizationName,
  }: SignUpPayload) => {
    if (!supabase) return { error: "Supabase가 설정되지 않았습니다." };

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          organization_mode: organizationMode,
          organization_id: organizationId ?? null,
          requested_organization_name: requestedOrganizationName ?? null,
        },
      },
    });

    if (error) {
      return { error: error.message };
    }

    return {
      message: "회원가입 신청이 접수되었습니다. 이메일 인증 후 기관 담당자 또는 어드민 승인까지 기다려 주세요.",
    };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const setCurrentOrganization = async (organizationId: string) => {
    if (!supabase || !user) return { error: "로그인이 필요합니다." };
    if (!isSystemAdmin) return { error: "Only system admin can change organization." };

    const { error } = await supabase
      .from("profiles")
      .update({ current_organization_id: organizationId })
      .eq("id", user.id);

    if (error) {
      return { error: error.message };
    }

    await refreshProfile();
    return {};
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        role: currentOrganizationRole ?? (profile?.role === "user" ? "user" : null),
        isSystemAdmin,
        currentOrganizationRole,
        memberships,
        organizationOptions,
        currentOrganization,
        loading,
        isConfigured: isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        refreshMemberships,
        setCurrentOrganization,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
