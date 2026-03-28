import { PageShell } from "@/components/layout/PageShell";
import { AdminSubmitButton } from "@/components/admin/AdminSubmitButton";
import { requireRole } from "@/lib/auth/server";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { getAdminQueue } from "@/lib/data/repository";
import { runAdminQueueAction } from "@/app/(admin)/admin/actions";

function successMessage(code: string) {
  if (code === "approved") return "Kuracja zatwierdzona.";
  if (code === "published") return "Wpis opublikowany w ABSOLUT.";
  if (code === "rejected") return "Kuracja odrzucona.";
  if (code === "revoked") return "Publikacja cofnieta.";
  if (code === "reviewed") return "Wpis przekazany do review.";
  if (code === "featured") return "Wpis oznaczony jako featured.";
  if (code === "archived") return "Wpis zarchiwizowany.";
  if (code === "pinned") return "Wpis przypiety na gorze.";
  if (code === "unpinned") return "Przypiecenie usuniete.";
  return "Operacja zakonczona powodzeniem.";
}

function errorMessage(code: string) {
  if (code === "forbidden") return "Brak uprawnien do wykonania tej operacji.";
  if (code === "entry_not_found") return "Nie znaleziono wskazanego wpisu.";
  if (code === "curation not found") return "Brak rekordu kuracji dla tego wpisu.";
  if (code === "invalid_request") return "Nieprawidlowe dane zadania operacji.";
  if (code === "auth_required") return "Sesja wygasla lub wymagane jest ponowne logowanie.";
  return "Operacja nie powiodla sie. Sprawdz logi i sprobuj ponownie.";
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ ok?: string; error?: string }>;
}) {
  await requireRole(ADMIN_ROLES, "/admin");

  const resolvedSearchParams = await searchParams;
  const queue = await getAdminQueue();

  return (
    <PageShell>
      <section className="content-wrap">
        <div className="panel p-8 sm:p-10">
          <span className="eyebrow">/admin</span>
          <h1 className="headline mt-4">Kuracja i zarzadzanie systemem</h1>
          <p className="copy mt-5 max-w-3xl">
            Widok admina porzadkuje kolejke kuracji, statusy publikacji i decyzje o tym,
            co moze przejsc do ABSOLUTU.
          </p>

          {resolvedSearchParams?.ok ? (
            <p className="mt-5 rounded-xl border border-emerald-300/40 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
              {successMessage(resolvedSearchParams.ok)}
            </p>
          ) : null}

          {resolvedSearchParams?.error ? (
            <p className="mt-5 rounded-xl border border-rose-300/40 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
              {errorMessage(resolvedSearchParams.error)}
            </p>
          ) : null}
        </div>
      </section>

      <section className="content-wrap mt-6 space-y-4">
        {queue.map((item) => (
          <article key={item.id} className="panel p-6">
            {(() => {
              const isCuratedPublic = item.entry.visibility === "curated_public";
              const status = item.curatorStatus;
              const isPending   = status === "pending";
              const isReview    = status === "review";
              const isApproved  = status === "approved";
              const isFeatured  = status === "featured";
              const isRejected  = status === "rejected";
              const isArchived  = status === "archived";

              const canReview  = isPending;
              const canApprove = isPending || isReview;
              const canFeature = isApproved;
              const canRevoke  = isCuratedPublic;
              const canPublish = !isCuratedPublic && isApproved;
              const canReject  = !isRejected && !isArchived;
              const canArchive = !isArchived;
              const canPin     = (isApproved || isFeatured) && !item.pinned;
              const canUnpin   = item.pinned;

              const hasActions = canReview || canApprove || canFeature || canRevoke || canPublish || canReject || canArchive || canPin || canUnpin;

              const statusColor: Record<string, string> = {
                pending:  "text-amber-300",
                review:   "text-sky-300",
                approved: "text-emerald-300",
                featured: "text-aura",
                rejected: "text-rose-400",
                archived: "text-mist",
              };

              return (
                <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`eyebrow ${statusColor[status] ?? ""}`}>{status}</span>
                  {item.pinned && (
                    <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-gold">
                      przypiety
                    </span>
                  )}
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-white">{item.entry.title}</h2>
                <p className="mt-2 text-sm uppercase tracking-[0.18em] text-gold">{item.room.title}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-mist">
                  {isCuratedPublic ? "opublikowany w ABSOLUT" : "poza ABSOLUT"}
                  {item.entry.locked ? " \u00b7 zablokowany" : ""}
                </p>
              </div>
              <div className="text-right text-sm text-mist">
                <p>featured_level: {item.featuredLevel}</p>
                <p>visibility: {item.entry.visibility}</p>
              </div>
            </div>
            <p className="copy mt-4">{item.entry.content}</p>

            <form action={runAdminQueueAction} className="mt-6 grid gap-3 md:grid-cols-[180px_1fr] md:items-end">
              <input type="hidden" name="entryId" value={item.entryId} />

              <label className="text-xs uppercase tracking-[0.18em] text-mist">
                featured level
                <input
                  type="number"
                  name="featuredLevel"
                  min={0}
                  max={10}
                  defaultValue={item.featuredLevel}
                  className="mt-2 w-full rounded-full border border-white/20 bg-black/20 px-4 py-2 text-sm text-white outline-none ring-0"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                {canReview  ? <AdminSubmitButton value="review"  label="Review" /> : null}
                {canApprove ? <AdminSubmitButton value="approve" label="Approve" /> : null}
                {canFeature ? <AdminSubmitButton value="feature" label="Feature" confirmMessage="Oznaczyc wpis jako Featured?" /> : null}
                {canPublish ? <AdminSubmitButton value="publish" label="Publish" confirmMessage="Czy na pewno opublikowac wpis w ABSOLUT?" /> : null}
                {canPin     ? <AdminSubmitButton value="pin"     label="Pin" /> : null}
                {canUnpin   ? <AdminSubmitButton value="unpin"   label="Unpin" /> : null}
                {canReject  ? <AdminSubmitButton value="reject"  label="Reject" /> : null}
                {canRevoke  ? <AdminSubmitButton value="revoke"  label="Revoke" confirmMessage="Czy na pewno cofnac publikacje wpisu?" /> : null}
                {canArchive ? <AdminSubmitButton value="archive" label="Archive" confirmMessage="Zarchiwizowac wpis? Zostanie ukryty z publicznego widoku." /> : null}

                {!hasActions ? (
                  <span className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.16em] text-mist">
                    Brak dostepnych akcji
                  </span>
                ) : null}
              </div>
            </form>
                </>
              );
            })()}
          </article>
        ))}
      </section>
    </PageShell>
  );
}
