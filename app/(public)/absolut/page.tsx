import Link from "next/link";
import { AbsolutEntryCard } from "@/features/absolut/ui/AbsolutEntryCard";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getAbsolutEntries, getAbsolutTags } from "@/features/absolut/data/queries";
import type { AbsolutView } from "@/features/absolut/data/queries";
import { searchAbsolutEntries } from "@/lib/data/repository";

const VIEW_LABELS: Record<AbsolutView, string> = {
  newest: "Najnowsze",
  top: "Najwazniejsze",
  thematic: "Tematyczne",
};

export default async function AbsolutPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string; tag?: string; q?: string }>;
}) {
  const params = await searchParams;
  const rawView = params?.view ?? "newest";
  const view: AbsolutView = (rawView === "top" || rawView === "thematic") ? rawView : "newest";
  const activeTag = params?.tag ?? undefined;
  const searchQuery = (params?.q ?? "").trim();

  const [baseEntries, tags, searchResults] = await Promise.all([
    searchQuery ? Promise.resolve([]) : getAbsolutEntries(view, activeTag),
    getAbsolutTags(),
    searchQuery ? searchAbsolutEntries(searchQuery) : Promise.resolve([]),
  ]);

  const entries = searchQuery ? searchResults : baseEntries;

  function viewHref(v: AbsolutView) {
    const q = new URLSearchParams();
    q.set("view", v);
    if (activeTag) q.set("tag", activeTag);
    return `/absolut?${q.toString()}`;
  }

  function tagHref(name: string) {
    const q = new URLSearchParams();
    q.set("view", view);
    if (activeTag === name) return `/absolut?view=${view}`;
    q.set("tag", name);
    return `/absolut?${q.toString()}`;
  }

  return (
    <PageShell>
      <section className="content-wrap">
        <div className="panel p-8 sm:p-10">
          <SectionHeading
            eyebrow="ABSOLUT"
            title="Biblioteka Najwyzszej Jakosci Inspiracji"
            copy="Publiczny widok pokazuje tylko tresci approved i featured. Prywatne watki pokojow nie sa tutaj widoczne."
          />

          {/* View mode selector */}
          {/* Search */}
          <form method="get" action="/absolut" className="mt-8">
            <div className="flex gap-2">
              <input
                type="search"
                name="q"
                defaultValue={searchQuery}
                placeholder="Szukaj w ABSOLUT..."
                className="flex-1 rounded-full border border-white/20 bg-black/20 px-5 py-2.5 text-sm text-white placeholder:text-mist/60 outline-none focus:border-aura/50"
              />
              <button type="submit" className="action-secondary">Szukaj</button>
              {searchQuery && (
                <Link href="/absolut" className="action-secondary">Wyczysc</Link>
              )}
            </div>
          </form>

          {/* View mode selector — hidden during search */}
          {!searchQuery && <nav className="mt-6 flex flex-wrap gap-2" aria-label="Tryb widoku">
            {(Object.keys(VIEW_LABELS) as AbsolutView[]).map((v) => (
              <Link
                key={v}
                href={viewHref(v)}
                className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.16em] transition-colors ${
                  view === v
                    ? "border-gold/50 bg-gold/10 text-gold"
                    : "border-white/15 bg-black/20 text-mist hover:border-white/30 hover:text-white"
                }`}
              >
                {VIEW_LABELS[v]}
              </Link>
            ))}
          </nav>
          }

          {/* Tag filter */}
          {tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Link
                  key={tag.name}
                  href={tagHref(tag.name)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    activeTag === tag.name
                      ? "border-aura/50 bg-aura/10 text-aura"
                      : "border-white/10 bg-white/5 text-mist hover:border-white/20 hover:text-white"
                  }`}
                >
                  #{tag.name}
                  <span className="ml-1 opacity-50">{tag.entryCount}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="content-wrap mt-6">
        {entries.length === 0 ? (
          <div className="panel p-8 text-center">
            <p className="copy">Brak wpisow spelniajacych kryteria.</p>
          </div>
        ) : (
          <div className="card-grid">
            {entries.map((entry) => (
              <AbsolutEntryCard
                key={entry.id}
                title={entry.title}
                content={entry.content}
                roomTitle={"room" in entry ? entry.room.title : ""}
                visibility={entry.visibility}
                featuredLevel={"featuredLevel" in entry ? entry.featuredLevel : 0}
                curatorStatus={"curatorStatus" in entry ? entry.curatorStatus : undefined}
                pinned={"pinned" in entry ? entry.pinned : false}
                tags={"tags" in entry ? (entry as any).tags : []}
                href={`/absolut/${entry.id}`}
              />
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
