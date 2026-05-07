import { createClient } from "@supabase/supabase-js";

export type AppRole = "user" | "worker" | "admin";
export type PlatformRole = "user" | "system_admin";
export type MembershipStatus = "invited" | "active" | "disabled";
export type OrganizationType = "public_agency" | "tree_hospital" | "other_org";
export type ProjectVisibility = "private" | "restricted" | "organization";
export type ProjectStatus = "draft" | "planning" | "bidding" | "in_progress" | "completed" | "cancelled";
export type ProjectMemberRole = "viewer" | "editor" | "manager";
export type WorkOrderStatus = "draft" | "requested" | "quoted" | "approved" | "in_progress" | "completed" | "cancelled";
export type WorkType = "inspection" | "pruning" | "surgery" | "nutrition" | "pest_control" | "removal";

export interface OrganizationSummary {
  id: string;
  name: string;
  code: string | null;
  organization_type: OrganizationType | string;
}

export interface OrganizationMembership {
  id: string;
  organization_id: string;
  role: AppRole;
  status: MembershipStatus;
  organization: OrganizationSummary;
}

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: PlatformRole;
  current_organization_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;
