import { notFound, redirect } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { getAuthUser, requireRole } from "@/lib/auth/server";
import { MEMBER_ROLES } from "@/lib/auth/roles";
import { getDialogMessagesForEntries, getRoomBySlug, getRoomConsentSettings, getRoomPrivateEntries, getRooms } from "@/lib/data/repository";
import { runMemberConsentAction, runMemberEntryAction } from "@/app/(member)/member/rooms/[slug]/actions";

function memberSuccessMessage(code: string) {
  if (code === "create") return "Utworzono nowy wpis.";
  if (code === "update") return "Zapisano zmiany wpisu.";
  if (code === "request_curation") return "Wpis zostal zgloszony do kuracji.";
  if (code === "consent_saved") return "Zapisano zgody publikacyjne.";
  return "Operacja zakonczona powodzeniem.";
}

function memberErrorMessage(code: string) {
  if (code === "forbidden") return "Brak uprawnien do tej operacji.";
  if (code === "room_not_found") return "Nie znaleziono pokoju.";
  if (code === "entry_not_found") return "Nie znaleziono wpisu.";
  if (code === "missing_entry_fields") return "Uzupelnij tytul i tresc wpisu.";
  if (code === "invalid_request") return "Nieprawidlowe dane zadania.";
  return "Operacja nie powiodla sie. Sprobuj ponownie.";
}

export async function generateStaticParams() {
  const rooms = await getRooms();
  return rooms.map((room) => ({ slug: room.slug }));
}

export default async function MemberRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ ok?: string; error?: string }>;
}) {
  const { slug } = await params;
  const role = await requireRole(MEMBER_ROLES, `/member/rooms/${slug}`);

  const room = await getRoomBySlug(slug);
  if (!room) notFound();

  if (role === "owner") {
    const user = await getAuthUser();
    if (user && user.id !== room.ownerId) {
      redirect("/");
    }
  }

  const entries = await getRoomPrivateEntries(slug);
  const consentSettings = await getRoomConsentSettings(slug);
  const dialogMessages = await getDialogMessagesForEntries(entries.map((entry) => entry.id));
  const status = await searchParams;

  return (
    <PageShell>
      <section className="content-wrap">
        <div className="panel p-8 sm:p-10">
          <span className="eyebrow">/member/rooms/{room.slug}</span>
          <h1 className="headline mt-4">Prywatna warstwa ownera - {room.title}</h1>
          <p className="copy mt-5 max-w-3xl">
            To widok docelowo chroniony rolami. Pokazuje komplet wpisow pokoju, w tym private,
            oraz dialogi AI powiazane z prywatnymi decyzjami ownera.
          </p>

          {status?.ok ? (
            <p className="mt-5 rounded-xl border border-emerald-300/40 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
              {memberSuccessMessage(status.ok)}
            </p>
          ) : null}

          {status?.error ? (
            <p className="mt-5 rounded-xl border border-rose-300/40 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
              {memberErrorMessage(status.error)}
            </p>
          ) : null}

          <form action={runMemberEntryAction} className="mt-8 grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-5">
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="entryAction" value="create" />

            <h2 className="text-lg font-semibold text-white">Nowy wpis ownera</h2>

            <input
              type="text"
              name="title"
              placeholder="Tytul wpisu"
              className="w-full rounded-xl border border-white/15 bg-black/20 px-4 py-2 text-sm text-white"
            />

            <textarea
              name="content"
              rows={4}
              placeholder="Tresc wpisu"
              className="w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-sm text-white"
            />

            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs uppercase tracking-[0.16em] text-mist">
                widocznosc
                <select name="visibility" className="ml-2 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs text-white">
                  <option value="private">private</option>
                  <option value="public_room">public_room</option>
                </select>
              </label>

              <button type="submit" className="action-primary">
                Dodaj wpis
              </button>
            </div>
          </form>

          <form action={runMemberConsentAction} className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-5">
            <input type="hidden" name="slug" value={slug} />
            <h2 className="text-lg font-semibold text-white">Zgody publikacyjne</h2>

            <label className="flex items-center gap-2 text-sm text-mist">
              <input type="checkbox" name="allowPublicExcerpt" defaultChecked={consentSettings.allowPublicExcerpt} />
              Zezwalam na publikacje fragmentow publicznych
            </label>

            <label className="flex items-center gap-2 text-sm text-mist">
              <input
                type="checkbox"
                name="allowAnonymousPublication"
                defaultChecked={consentSettings.allowAnonymousPublication}
              />
              Zezwalam na publikacje anonimowa
            </label>

            <button type="submit" className="action-secondary w-max">
              Zapisz zgody
            </button>
          </form>
        </div>
      </section>

      <section className="content-wrap mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="panel p-8">
          <h2 className="text-2xl font-semibold text-white">Wpisy pokoju</h2>
          <div className="mt-6 space-y-4">
            {entries.map((entry) => (
              <article key={entry.id} className="data-card">
                <span className="eyebrow">{entry.visibility}</span>
                <h3 className="mt-4 text-xl font-semibold text-white">{entry.title}</h3>
                <p className="copy mt-3">{entry.content}</p>

                <form action={runMemberEntryAction} className="mt-4 space-y-3 rounded-xl border border-white/10 p-4">
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="entryAction" value="update" />
                  <input type="hidden" name="entryId" value={entry.id} />

                  <input
                    type="text"
                    name="title"
                    defaultValue={entry.title}
                    className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white"
                  />
                  <textarea
                    name="content"
                    rows={3}
                    defaultValue={entry.content}
                    className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white"
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      name="visibility"
                      defaultValue={entry.visibility === "private" ? "private" : "public_room"}
                      className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs text-white"
                    >
                      <option value="private">private</option>
                      <option value="public_room">public_room</option>
                    </select>
                    <button type="submit" className="action-secondary">
                      Zapisz wpis
                    </button>
                  </div>
                </form>

                <form action={runMemberEntryAction} className="mt-3 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="entryAction" value="request_curation" />
                  <input type="hidden" name="entryId" value={entry.id} />
                  <label className="text-xs uppercase tracking-[0.14em] text-mist">
                    featured
                    <input
                      type="number"
                      name="featuredLevel"
                      min={0}
                      max={10}
                      defaultValue={0}
                      className="ml-2 w-20 rounded-full border border-white/15 bg-black/30 px-2 py-1 text-xs text-white"
                    />
                  </label>
                  <button type="submit" className="action-secondary">
                    Zglos do kuracji
                  </button>
                </form>
              </article>
            ))}
          </div>
        </div>
        <aside className="panel p-8">
          <h2 className="text-2xl font-semibold text-white">Dialogi AI</h2>
          <div className="mt-6 space-y-4">
            {dialogMessages.length === 0 ? (
              <p className="copy">Brak dialogow AI dla tego pokoju w danych demo.</p>
            ) : (
              dialogMessages.map((message) => (
                <article key={message.id} className="data-card">
                  <p className="text-xs uppercase tracking-[0.18em] text-gold">{message.role}</p>
                  <p className="copy mt-3">{message.content}</p>
                </article>
              ))
            )}
          </div>
        </aside>
      </section>
    </PageShell>
  );
}
