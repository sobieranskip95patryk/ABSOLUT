import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnv, isMockMode } from "@/lib/env";

function isProtectedPath(pathname: string) {
  return pathname.startsWith("/member") || pathname.startsWith("/admin");
}

function isAdminPath(pathname: string) {
  return pathname.startsWith("/admin");
}

function isMemberPath(pathname: string) {
  return pathname.startsWith("/member");
}

function isAdminAuditPath(pathname: string) {
  return pathname.startsWith("/admin/audit");
}

export async function middleware(request: NextRequest) {
  if (!isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (isMockMode() || !hasSupabaseEnv()) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminPath(request.nextUrl.pathname)) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const role = profile?.role;

    if (isAdminAuditPath(request.nextUrl.pathname) && role !== "admin") {
      const deniedUrl = request.nextUrl.clone();
      deniedUrl.pathname = "/admin";
      deniedUrl.search = "";
      return NextResponse.redirect(deniedUrl);
    }

    if (role !== "admin" && role !== "curator") {
      const deniedUrl = request.nextUrl.clone();
      deniedUrl.pathname = "/";
      deniedUrl.search = "";
      return NextResponse.redirect(deniedUrl);
    }
  }

  if (isMemberPath(request.nextUrl.pathname)) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const role = profile?.role;

    if (role !== "owner" && role !== "curator" && role !== "admin") {
      const deniedUrl = request.nextUrl.clone();
      deniedUrl.pathname = "/";
      deniedUrl.search = "";
      return NextResponse.redirect(deniedUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/member/:path*", "/admin/:path*"],
};
