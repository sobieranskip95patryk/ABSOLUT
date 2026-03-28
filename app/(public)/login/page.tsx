import { redirect } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { getAuthState, roleHomePath } from "@/lib/auth/server";
import { loginWithPasswordAction } from "@/app/(public)/login/actions";

function authErrorMessage(code: string) {
  if (code === "auth_not_configured") return "Logowanie jest niedostepne: brak konfiguracji Supabase.";
  if (code === "missing_credentials") return "Podaj email i haslo.";
  if (code.toLowerCase().includes("invalid login credentials")) return "Nieprawidlowy email lub haslo.";
  return "Nie udalo sie zalogowac. Sprobuj ponownie.";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string; error?: string; ok?: string }>;
}) {
  const { user, role } = await getAuthState();
  if (user) {
    redirect(roleHomePath(role));
  }

  const params = await searchParams;
  const nextPath = params?.next ?? "";

  return (
    <PageShell>
      <section className="content-wrap">
        <div className="mx-auto max-w-xl panel p-8 sm:p-10">
          <span className="eyebrow">/login</span>
          <h1 className="headline mt-4">Logowanie do Global Vision</h1>
          <p className="copy mt-4">
            Zaloguj sie, aby uzyskac dostep do strefy member lub admin zgodnie z rola konta.
          </p>

          {params?.ok === "logged_out" ? (
            <p className="mt-5 rounded-xl border border-emerald-300/40 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
              Wylogowano poprawnie.
            </p>
          ) : null}

          {params?.error ? (
            <p className="mt-5 rounded-xl border border-rose-300/40 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
              {authErrorMessage(params.error)}
            </p>
          ) : null}

          <form action={loginWithPasswordAction} className="mt-8 space-y-4">
            <input type="hidden" name="next" value={nextPath} />

            <label className="block text-xs uppercase tracking-[0.18em] text-mist">
              Email
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="mt-2 w-full rounded-2xl border border-white/15 bg-black/20 px-4 py-3 text-sm text-white outline-none"
              />
            </label>

            <label className="block text-xs uppercase tracking-[0.18em] text-mist">
              Haslo
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                className="mt-2 w-full rounded-2xl border border-white/15 bg-black/20 px-4 py-3 text-sm text-white outline-none"
              />
            </label>

            <button type="submit" className="action-primary mt-2">
              Zaloguj
            </button>
          </form>
        </div>
      </section>
    </PageShell>
  );
}
