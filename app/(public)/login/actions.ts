"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient, getCurrentRole, roleHomePath } from "@/lib/auth/server";
import { hasSupabaseEnv } from "@/lib/env";

function safeNextPath(nextPath: string | null) {
  if (!nextPath) return null;
  if (!nextPath.startsWith("/")) return null;
  if (nextPath.startsWith("//")) return null;
  return nextPath;
}

export async function loginWithPasswordAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirect("/login?error=auth_not_configured");
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextPath = safeNextPath(String(formData.get("next") ?? "") || null);

  if (!email || !password) {
    redirect("/login?error=missing_credentials");
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect("/login?error=auth_not_configured");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message || "login_failed")}`);
  }

  if (nextPath) {
    redirect(nextPath);
  }

  const role = await getCurrentRole();
  redirect(roleHomePath(role));
}
