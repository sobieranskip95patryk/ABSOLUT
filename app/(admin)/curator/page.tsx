import { PageShell } from "@/components/layout/PageShell";
import { requireRole } from "@/lib/auth/server";
import { getAdminQueue } from "@/lib/data/repository";
import { runCuratorQueueAction } from "@/app/(admin)/curator/actions";

export default async function CuratorPage({
  searchParams,
}: {
  searchParams?: Promise<{ ok?: string; error?: string }>;
}) {
  await requireRole(["curator", "admin"], "/curator");

  const queue = await getAdminQueue();
  const params = await searchParams;

  function successMessage(code: string) {
    if (code === "approved") return "Wpis zatwierdzony.";
    if (code === "rejected") return "Wpis odrzucony.";
    if (code === "reviewed") return "Wpis oznaczony jako przejrzany.";
    return "Operacja zakonczona powodzeniem.";
  }

  function errorMessage(code: string) {
    if (code === "forbidden") return "Brak uprawnien.";
    if (code === "invalid_request") return "Nieprawidlowe dane.";
    return "Operacja nie powiodla sie.";
  }

  const statusColor: Record<string, string> = {
    pending: "text-amber-300",
    review: "text-sky-300",
    approved: "text-emerald-300",
    featured: "text-aura",
    rejected: "text-rose-400",
    archived: "text-mist",
  };

  // Curator sees only pending/review entries
  const curatorQueue = queue.filter((item) =>
    item.curatorStatus === "pending" || item.curatorStatus === "review"
  );

  return (
    <PageShell>
      <section className="content-wrap">
        <div className="panel p-8 sm:p-10">
          <span className="eyebrow">Curator Panel</span>
          <h1 className="headline mt-4">Kolejka kuratorska</h1>
          <p className="copy mt-3 max-w-2xl">
            Twoje zadanie: przejrzyj i zatwierdz lub odrzuc zgloszenia wpisow. Pin, archive i feature sa zastrzeżone dla admina.
          </p>

          {params?.ok && (
            <p className="mt-5 rounded-xl border border-emerald-300/40 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
              {successMessage(params.ok)}
            </p>
          )}
          {params?.error && (
            <p className="mt-5 rounded-xl border border-rose-300/40 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
              {errorMessage(params.error)}
            </p>
          )}

          {curatorQueue.length === 0 && (
            <p className="mt-6 copy text-emerald-300">Kolejka pusta — brak wpisow do weryfikacji.</p>
          )}
        </div>
      </section>

      <section className="content-wrap mt-6 space-y-4">
        {curatorQueue.map((item) => {
          const status = item.curatorStatus;
          const canReview = status === "pending";
          const canApprove = status === "pending" || status === "review";
          const canReject = status !== "rejected";

          return (
            <article key={item.id} className="panel p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className={`eyebrow ${statusColor[status] ?? ""}`}>{status}</span>
                  {item.entry.locked && (
                    <span className="ml-3 inline-block rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-amber-300">
                      zablokowany
                    </span>
                  )}
                  <h2 className="mt-3 text-xl font-semibold text-white">{item.entry.title}</h2>
                  <p className="mt-1 text-sm uppercase tracking-[0.18em] text-gold">{item.room.title}</p>
                  <p className="mt-1 text-xs text-mist">{item.entry.visibility}</p>
                </div>
                <p className="text-xs text-mist/60">featured_level: {item.featuredLevel}</p>
              </div>

              <p className="copy mt-4">{item.entry.content}</p>

              <form action={runCuratorQueueAction} className="mt-5 flex flex-wrap gap-3 items-center">
                <input type="hidden" name="entryId" value={item.entryId} />
                <input type="hidden" name="featuredLevel" value={item.featuredLevel} />

                {canReview && (
                  <button type="submit" name="action" value="review" className="action-secondary">
                    Oznacz jako przejrzany
                  </button>
                )}
                {canApprove && (
                  <button type="submit" name="action" value="approve" className="action-primary">
                    Zatwierdz
                  </button>
                )}
                {canReject && (
                  <button type="submit" name="action" value="reject" className="action-secondary">
                    Odrzuc
                  </button>
                )}
              </form>
            </article>
          );
        })}
      </section>
    </PageShell>
  );
}
