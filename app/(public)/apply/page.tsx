import { PageShell } from "@/components/layout/PageShell";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { runApplyAction } from "@/app/(public)/apply/actions";

type Props = {
  searchParams?: Promise<{ ok?: string; error?: string }>;
};

function errorMessage(code: string) {
  if (code === "missing_fields") return "Uzupelnij email i nazwe.";
  if (code === "motivation_too_short") return "Uzasadnienie musi miec co najmniej 20 znakow.";
  if (code === "submit_failed") return "Blad wyslania. Sprobuj ponownie.";
  return "Wystapil blad.";
}

export default async function ApplyPage({ searchParams }: Props) {
  const params = await searchParams;

  if (params?.ok === "submitted") {
    return (
      <PageShell>
        <section className="content-wrap">
          <div className="panel p-8 sm:p-12 text-center">
            <span className="eyebrow text-emerald-300">Wyslano</span>
            <h1 className="headline mt-4">Aplikacja zostala przyjeta</h1>
            <p className="copy mt-5 max-w-xl mx-auto">
              Twoje zgloszenie trafia do kolejki administracyjnej. Otrzymasz informacje zwrotna na podany adres e-mail po weryfikacji.
            </p>
          </div>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="content-wrap">
        <div className="panel p-8 sm:p-12">
          <SectionHeading
            eyebrow="Dolacz"
            title="Aplikuj o status Wlasciciela Pokoju"
            copy="Przestrzenie ABSOLUT sa tworzone przez wybranych wlascicieli. Opisz swoj projekt i motywacje."
          />

          {params?.error ? (
            <p className="mt-6 rounded-xl border border-rose-300/40 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
              {errorMessage(params.error)}
            </p>
          ) : null}

          <form action={runApplyAction} className="mt-8 grid max-w-2xl gap-5">
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-[0.16em] text-mist">
                Adres e-mail
              </label>
              <input
                type="email"
                name="email"
                required
                placeholder="twoj@email.com"
                className="rounded-full border border-white/20 bg-black/20 px-5 py-3 text-sm text-white placeholder:text-mist/50 outline-none focus:border-aura/50"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-[0.16em] text-mist">
                Nazwa / pseudonim
              </label>
              <input
                type="text"
                name="displayName"
                required
                placeholder="Twoja nazwa w systemie"
                className="rounded-full border border-white/20 bg-black/20 px-5 py-3 text-sm text-white placeholder:text-mist/50 outline-none focus:border-aura/50"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-[0.16em] text-mist">
                Uzasadnienie (min. 20 znakow)
              </label>
              <textarea
                name="motivation"
                required
                rows={5}
                minLength={20}
                placeholder="Opisz swoj projekt, wizje i cel udzialu w systemie MTAQuestWebsideX..."
                className="rounded-2xl border border-white/20 bg-black/20 px-5 py-4 text-sm text-white placeholder:text-mist/50 outline-none focus:border-aura/50 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button type="submit" className="action-primary">
                Wyslij aplikacje
              </button>
            </div>
          </form>
        </div>
      </section>
    </PageShell>
  );
}
