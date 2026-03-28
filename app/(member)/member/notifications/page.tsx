import { PageShell } from "@/components/layout/PageShell";
import { requireRole } from "@/lib/auth/server";
import { MEMBER_ROLES } from "@/lib/auth/roles";
import { getOwnerNotifications } from "@/lib/data/repository";
import { runMarkReadAction } from "./actions";

const kindLabel: Record<string, string> = {
  approved: "Wpis zatwierdzony",
  rejected: "Wpis odrzucony",
  featured: "Wpis wyrozniony",
  pinned: "Wpis przypiety",
  unpinned: "Wpis odpiety",
};

export default async function NotificationsPage() {
  await requireRole(MEMBER_ROLES, "/member/notifications");

  const notifications = await getOwnerNotifications();

  return (
    <PageShell>
      <section className="content-wrap">
        <div className="panel p-8 sm:p-10">
          <span className="eyebrow">/member/notifications</span>
          <h1 className="headline mt-4">Powiadomienia</h1>

          {notifications.length > 0 && (
            <form action={runMarkReadAction} className="mt-5">
              <button type="submit" className="action-secondary">
                Oznacz wszystkie jako przeczytane
              </button>
            </form>
          )}

          <div className="mt-8 space-y-4">
            {notifications.length === 0 ? (
              <p className="copy">Brak powiadomien.</p>
            ) : (
              notifications.map((n) => (
                <article
                  key={n.id}
                  className={`data-card ${!n.isRead ? "border-gold/40 bg-gold/5" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {kindLabel[n.kind] ?? n.kind}
                      </p>
                      {n.entryId && (
                        <p className="mt-1 text-xs text-mist">
                          Wpis:{" "}
                          <a
                            href={`/absolut/${n.entryId}`}
                            className="underline hover:text-white"
                          >
                            {n.entryId}
                          </a>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <time className="text-[11px] text-mist">
                        {new Date(n.createdAt).toLocaleString("pl")}
                      </time>
                      {!n.isRead && (
                        <span className="rounded-full bg-gold px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-ink">
                          nowe
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
