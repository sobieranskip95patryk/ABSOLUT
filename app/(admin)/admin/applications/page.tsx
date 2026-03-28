import { PageShell } from "@/components/layout/PageShell";
import { requireRole } from "@/lib/auth/server";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { getOwnerApplications } from "@/lib/data/repository";
import { runApplicationReviewAction } from "@/app/(admin)/admin/applications/actions";

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ ok?: string; error?: string }>;
}) {
  await requireRole(ADMIN_ROLES, "/admin/applications");

  const applications = await getOwnerApplications();
  const params = await searchParams;

  const statusColor: Record<string, string> = {
    pending: "text-amber-300",
    approved: "text-emerald-300",
    rejected: "text-rose-400",
  };

  return (
    <PageShell>
      <section className="content-wrap">
        <div className="panel p-8 sm:p-10">
          <span className="eyebrow">Admin</span>
          <h1 className="headline mt-4">Aplikacje wlascicielskie</h1>
          <p className="copy mt-3 max-w-2xl">
            Zgloszenia kandydatow o status Owner w systemie MTAQuestWebsideX.
          </p>

          {params?.ok && (
            <p className="mt-5 rounded-xl border border-emerald-300/40 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
              {params.ok === "approved" ? "Aplikacja zatwierdzona." : "Aplikacja odrzucona."}
            </p>
          )}
          {params?.error && (
            <p className="mt-5 rounded-xl border border-rose-300/40 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
              {params.error === "forbidden" ? "Brak uprawnien." : "Blad operacji."}
            </p>
          )}
        </div>
      </section>

      <section className="content-wrap mt-6 space-y-4">
        {applications.length === 0 ? (
          <div className="panel p-8 text-center">
            <p className="copy">Brak aplikacji w kolejce.</p>
          </div>
        ) : applications.map((app) => (
          <article key={app.id} className="panel p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className={`eyebrow ${statusColor[app.status] ?? ""}`}>{app.status}</span>
                <h2 className="mt-3 text-xl font-semibold text-white">{app.displayName}</h2>
                <p className="mt-1 text-sm text-mist">{app.email}</p>
                <p className="mt-1 text-xs text-mist/60">
                  {new Date(app.createdAt).toLocaleDateString("pl-PL")}
                </p>
              </div>
            </div>

            <p className="copy mt-4 max-w-2xl">{app.motivation}</p>

            {app.status === "pending" && (
              <div className="mt-5 flex flex-wrap gap-3">
                <form action={runApplicationReviewAction}>
                  <input type="hidden" name="applicationId" value={app.id} />
                  <input type="hidden" name="decision" value="approved" />
                  <button type="submit" className="action-primary">Zatwierdz</button>
                </form>
                <form action={runApplicationReviewAction}>
                  <input type="hidden" name="applicationId" value={app.id} />
                  <input type="hidden" name="decision" value="rejected" />
                  <button type="submit" className="action-secondary">Odrzuc</button>
                </form>
              </div>
            )}

            {app.status !== "pending" && app.reviewedAt && (
              <p className="mt-4 text-xs text-mist/60">
                Rozpatrzono: {new Date(app.reviewedAt).toLocaleDateString("pl-PL")}
              </p>
            )}
          </article>
        ))}
      </section>
    </PageShell>
  );
}
