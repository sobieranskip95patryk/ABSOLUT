import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { requireRole } from "@/lib/auth/server";
import { getAuditLogs } from "@/lib/data/repository";

type AuditParams = {
  actor_id?: string;
  action?: string;
  entity_type?: string;
  start?: string;
  end?: string;
  page?: string;
};

function buildPageHref(base: AuditParams, nextPage: number) {
  const query = new URLSearchParams();

  if (base.actor_id) query.set("actor_id", base.actor_id);
  if (base.action) query.set("action", base.action);
  if (base.entity_type) query.set("entity_type", base.entity_type);
  if (base.start) query.set("start", base.start);
  if (base.end) query.set("end", base.end);
  query.set("page", String(nextPage));

  return `/admin/audit?${query.toString()}`;
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams?: Promise<AuditParams>;
}) {
  await requireRole(["admin"], "/admin/audit");

  const params = (await searchParams) ?? {};
  const page = Math.max(Number(params.page ?? "1") || 1, 1);

  const result = await getAuditLogs({
    actorId: params.actor_id?.trim() || undefined,
    action: params.action?.trim() || undefined,
    entityType: params.entity_type?.trim() || undefined,
    startDate: params.start?.trim() || undefined,
    endDate: params.end?.trim() || undefined,
    page,
    pageSize: 20,
  });

  const totalPages = Math.max(Math.ceil(result.total / result.pageSize), 1);

  return (
    <PageShell>
      <section className="content-wrap">
        <div className="panel p-8 sm:p-10">
          <span className="eyebrow">/admin/audit</span>
          <h1 className="headline mt-4">Audit Log</h1>
          <p className="copy mt-4 max-w-3xl">
            Rejestr operacji systemowych: publikacje, cofniecia, zmiany widocznosci i kuracja wpisow.
          </p>

          <form className="mt-6 grid gap-4 md:grid-cols-3">
            <label className="text-xs uppercase tracking-[0.16em] text-mist">
              actor_id
              <input
                name="actor_id"
                defaultValue={params.actor_id ?? ""}
                className="mt-2 w-full rounded-2xl border border-white/15 bg-black/20 px-4 py-2 text-sm text-white"
              />
            </label>

            <label className="text-xs uppercase tracking-[0.16em] text-mist">
              action
              <input
                name="action"
                defaultValue={params.action ?? ""}
                className="mt-2 w-full rounded-2xl border border-white/15 bg-black/20 px-4 py-2 text-sm text-white"
              />
            </label>

            <label className="text-xs uppercase tracking-[0.16em] text-mist">
              entity_type
              <input
                name="entity_type"
                defaultValue={params.entity_type ?? ""}
                className="mt-2 w-full rounded-2xl border border-white/15 bg-black/20 px-4 py-2 text-sm text-white"
              />
            </label>

            <label className="text-xs uppercase tracking-[0.16em] text-mist">
              data od
              <input
                type="date"
                name="start"
                defaultValue={params.start ?? ""}
                className="mt-2 w-full rounded-2xl border border-white/15 bg-black/20 px-4 py-2 text-sm text-white"
              />
            </label>

            <label className="text-xs uppercase tracking-[0.16em] text-mist">
              data do
              <input
                type="date"
                name="end"
                defaultValue={params.end ?? ""}
                className="mt-2 w-full rounded-2xl border border-white/15 bg-black/20 px-4 py-2 text-sm text-white"
              />
            </label>

            <div className="flex items-end gap-3">
              <button type="submit" className="action-primary">
                Filtruj
              </button>
              <Link href="/admin/audit" className="action-secondary">
                Reset
              </Link>
            </div>
          </form>
        </div>
      </section>

      <section className="content-wrap mt-6 space-y-4">
        {result.items.length === 0 ? (
          <div className="panel p-6">
            <p className="copy">Brak wpisow audit log dla ustawionych filtrow.</p>
          </div>
        ) : (
          result.items.map((item) => (
            <article key={item.id} className="panel p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">{item.action}</p>
                  <p className="mt-3 text-sm uppercase tracking-[0.16em] text-gold">{item.entityType}</p>
                  <p className="mt-1 text-xs text-mist">entity_id: {item.entityId ?? "-"}</p>
                  <p className="mt-1 text-xs text-mist">actor_id: {item.actorId ?? "-"}</p>
                </div>
                <p className="text-xs text-mist">{new Date(item.createdAt).toLocaleString("pl-PL")}</p>
              </div>
              <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-black/25 p-4 text-xs text-mist">
                {JSON.stringify(item.payload, null, 2)}
              </pre>
            </article>
          ))
        )}

        <div className="panel flex items-center justify-between gap-3 p-4">
          <span className="text-xs uppercase tracking-[0.16em] text-mist">
            strona {result.page} / {totalPages} | rekordy: {result.total}
          </span>
          <div className="flex gap-2">
            {result.page > 1 ? (
              <Link href={buildPageHref(params, result.page - 1)} className="action-secondary">
                Poprzednia
              </Link>
            ) : null}
            {result.page < totalPages ? (
              <Link href={buildPageHref(params, result.page + 1)} className="action-secondary">
                Nastepna
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
