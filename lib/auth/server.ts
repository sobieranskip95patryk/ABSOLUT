import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasSupabaseEnv, isMockMode } from "@/lib/env";
import type { Role } from "@/lib/data/types";

export type AuthState = {
  user: User | null;
  role: Role | "guest";
};

function getCredentials() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export async function createSupabaseServerClient() {
  const credentials = getCredentials();
  if (!credentials) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(credentials.url, credentials.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            (cookieStore as any).set?.(name, value, options);
          }
        } catch {
          // Server Components can be read-only for cookies; middleware handles refresh writes.
        }
      },
    },
  });
}

export async function getAuthUser(): Promise<User | null> {
  if (isMockMode() || !hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return null;
  }

  return data.user ?? null;
}

export async function getCurrentRole(): Promise<Role | "guest"> {
  if (isMockMode() || !hasSupabaseEnv()) {
    return "guest";
  }

  const user = await getAuthUser();
  if (!user) {
    return "guest";
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return "guest";
  }

  const { data, error } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (error || !data) {
    return "guest";
  }

  return (data.role as Role) ?? "guest";
}

export async function getAuthState(): Promise<AuthState> {
  const user = await getAuthUser();
  if (!user) {
    return { user: null, role: "guest" };
  }

  const role = await getCurrentRole();
  return { user, role };
}

export function roleHomePath(role: Role | "guest") {
  if (role === "admin" || role === "curator") {
    return "/admin";
  }

  if (role === "owner") {
    return "/member/rooms/absolut";
  }

  return "/";
}

function buildLoginRedirectPath(nextPath: string) {
  return `/login?next=${encodeURIComponent(nextPath)}`;
}

export async function requireAuthenticatedUser(nextPath: string) {
  if (isMockMode() || !hasSupabaseEnv()) {
    return null;
  }

  const user = await getAuthUser();
  if (!user) {
    redirect(buildLoginRedirectPath(nextPath));
  }

  return user;
}

export async function requireRole(allowedRoles: Role[], nextPath: string) {
  if (isMockMode() || !hasSupabaseEnv()) {
    return "guest" as const;
  }

  await requireAuthenticatedUser(nextPath);

  const role = await getCurrentRole();
  if (!allowedRoles.includes(role as Role)) {
    redirect("/");
  }

  return role;
}
