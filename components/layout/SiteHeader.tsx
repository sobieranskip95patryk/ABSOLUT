import Link from "next/link";
import { getAuthState } from "@/lib/auth/server";
import { logoutAction } from "@/lib/auth/actions";

export async function SiteHeader() {
  const { user, role } = await getAuthState();
  const isAdmin = role === "admin" || role === "curator";

  const navigation = [
    { href: "/", label: "Start" },
    { href: "/absolut", label: "Absolut" },
    { href: "/rooms", label: "Pokoje" },
    { href: "/member/rooms/absolut", label: "Member" },
    { href: "/admin", label: "Admin" },
    ...(isAdmin ? [{ href: "/admin/audit", label: "Audit" }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink/80 backdrop-blur-xl">
      <div className="content-wrap flex min-h-[76px] flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full border border-white/10 text-pearl">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </span>
          <span>
            <span className="block text-sm font-bold uppercase tracking-[0.28em] text-white">Global Vision</span>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-mist">powered by META-GENIUSZ System</span>
          </span>
        </Link>
        <nav className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.18em] text-mist">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-white">
              {item.label}
            </Link>
          ))}

          {user ? (
            <>
              <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] tracking-[0.14em] text-pearl/80">
                {role} | {user.email ?? "user"}
              </span>
              <form action={logoutAction}>
                <button type="submit" className="transition hover:text-white">
                  Wyloguj
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="transition hover:text-white">
              Logowanie
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
