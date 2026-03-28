import { redirect } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { getAuthUser, requireRole } from "@/lib/auth/server";
import { MEMBER_ROLES } from "@/lib/auth/roles";
import { getRooms, getRoomPrivateEntries, performMemberEntryAction } from "@/lib/data/repository";

async function runOnboardingEntryAction(formData: FormData) {
  "use server";

  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!slug || !title || !content) {
    redirect("/member/onboarding?error=missing_fields");
  }

  const rooms = await getRooms();
  const room = rooms.find((r) => r.slug === slug);
  if (!room) {
    redirect("/member/onboarding?error=room_not_found");
  }

  try {
    await performMemberEntryAction({
      roomId: room.id,
      action: "create",
      title,
      content,
      visibility: "private",
      featuredLevel: 0,
    });
  } catch {
    redirect("/member/onboarding?error=create_failed");
  }

  redirect(`/member/rooms/${slug}?ok=onboarding_entry_created`);
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<{ step?: string; error?: string; ok?: string }>;
}) {
  await requireRole(MEMBER_ROLES, "/member/onboarding");
  const user = await getAuthUser();

  const sp = await searchParams;
  const step = Number(sp?.step ?? 1);
  const errorCode = sp?.error;

  const rooms = await getRooms();

  const ownerRooms = user
    ? rooms.filter((r) => r.ownerId === user.id)
    : rooms;

  const hasEntries = user
    ? (
        await Promise.all(
          ownerRooms.map((r) => getRoomPrivateEntries(r.slug)),
        )
      ).some((list) => list.length > 0)
    : false;

  if (hasEntries && !errorCode) {
    redirect("/member");
  }

  const stepLabels = ["Twoj pierwszy wpis", "Zgody publikacyjne", "Opcjonalna kuracja"];

  return (
    <PageShell>
      <section className="content-wrap max-w-2xl">
        <div className="panel p-8 sm:p-12">
          <span className="eyebrow">onboarding</span>
          <h1 className="headline mt-4">Witaj w systemie ABSOLUT</h1>
          <p className="copy mt-4 max-w-xl">
            Przeprowadzimy Cie przez trzy krotkie kroki: stworzenie pierwszego wpisu,
            ustawienie zgod publikacyjnych i opcjonalne zgloszenie do kuracji.
          </p>

          <ol className="mt-8 flex gap-4">
            {stepLabels.map((label, idx) => {
              const n = idx + 1;
              const active = n === step;
              const done = n < step;
              return (
                <li
                  key={n}
                  className={`flex items-center gap-2 text-xs uppercase tracking-[0.16em] ${active ? "text-gold" : done ? "text-emerald-300" : "text-mist"}`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold ${active ? "border-gold text-gold" : done ? "border-emerald-300 text-emerald-300" : "border-white/20 text-mist"}`}
                  >
                    {done ? "\u2713" : n}
                  </span>
                  <span className="hidden sm:inline">{label}</span>
                </li>
              );
            })}
          </ol>

          {errorCode ? (
            <p className="mt-6 rounded-xl border border-rose-300/40 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
              {errorCode === "missing_fields"
                ? "Uzupelnij tytul i tresc wpisu."
                : errorCode === "room_not_found"
                  ? "Nie znaleziono pokoju."
                  : "Cos poszlo nie tak. Sprobuj ponownie."}
            </p>
          ) : null}

          <form action={runOnboardingEntryAction} className="mt-8 grid gap-5">
            {step === 1 || step === 2 || step === 3 ? (
              <>
                <div className="grid gap-2">
                  <label className="text-xs uppercase tracking-[0.16em] text-mist">
                    Pokoj
                  </label>
                  <select
                    name="slug"
                    required
                    className="rounded-full border border-white/15 bg-black/30 px-4 py-2 text-sm text-white"
                  >
                    {ownerRooms.map((r) => (
                      <option key={r.id} value={r.slug}>
                        {r.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className="text-xs uppercase tracking-[0.16em] text-mist">
                    Tytul wpisu
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    maxLength={200}
                    placeholder="Krotki, precyzyjny tytul"
                    className="w-full rounded-xl border border-white/15 bg-black/20 px-4 py-2 text-sm text-white"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs uppercase tracking-[0.16em] text-mist">
                    Tresc
                  </label>
                  <textarea
                    name="content"
                    required
                    rows={5}
                    placeholder="Zapisz mysli, fragment rozmowy lub refleksje..."
                    className="w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-sm text-white"
                  />
                </div>

                <p className="text-xs text-mist/70">
                  Po zapisaniu wpisu przejdziesz do widoku pokoju, gdzie mozesz ustawic zgody i zglosic wpis do kuracji.
                </p>

                <button type="submit" className="action-primary mt-2">
                  Utworz pierwszy wpis
                </button>

                <a href="/member" className="action-secondary mt-1 w-max text-center">
                  Pomin — zrob to pozniej
                </a>
              </>
            ) : null}
          </form>
        </div>
      </section>
    </PageShell>
  );
}
