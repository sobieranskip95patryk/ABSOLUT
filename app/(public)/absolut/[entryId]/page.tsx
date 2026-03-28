import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { getAbsolutEntries, getAbsolutEntryById, recordEntryView } from "@/lib/data/repository";

type Props = {
  params: Promise<{ entryId: string }>;
};

export async function generateStaticParams() {
  const entries = await getAbsolutEntries("newest");
  return entries.map((e) => ({ entryId: e.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { entryId } = await params;
  const entry = await getAbsolutEntryById(entryId);
  if (!entry) return { title: "Nie znaleziono" };

  const description = entry.content.slice(0, 160);
  const url = `https://www.mtaquestwebsidex.com/absolut/${entryId}`;

  return {
    title: `${entry.title} — ABSOLUT`,
    description,
    openGraph: {
      title: entry.title,
      description,
      url,
      siteName: "ABSOLUT by MTAQuestWebsideX",
      type: "article",
      images: entry.room.heroImageUrl ? [{ url: entry.room.heroImageUrl }] : [],
    },
    alternates: { canonical: url },
  };
}

export default async function AbsolutEntryPage({ params }: Props) {
  const { entryId } = await params;
  const entry = await getAbsolutEntryById(entryId);
  if (!entry) notFound();

  // Fire-and-forget view count increment
  try {
    await recordEntryView(entryId, "guest");
  } catch {
    // non-blocking
  }

  const statusColor: Record<string, string> = {
    approved: "text-emerald-300",
    featured: "text-aura",
  };

  return (
    <PageShell>
      <article className="content-wrap">
        <div className="panel p-8 sm:p-12">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-mist">
            <Link href="/absolut" className="hover:text-white transition-colors">ABSOLUT</Link>
            <span>/</span>
            <Link href={`/rooms/${entry.room.slug}`} className="hover:text-white transition-colors">
              {entry.room.title}
            </Link>
          </nav>

          {/* Header */}
          <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {entry.pinned && (
                  <span className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em] text-gold">
                    przypiety
                  </span>
                )}
                {entry.curatorStatus === "featured" && (
                  <span className="rounded-full border border-aura/40 bg-aura/10 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em] text-aura">
                    featured
                  </span>
                )}
                {entry.featuredLevel > 0 && (
                  <span className="rounded-full border border-white/15 bg-black/20 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-mist">
                    lvl {entry.featuredLevel}
                  </span>
                )}
                <span className={`text-xs uppercase tracking-[0.16em] ${statusColor[entry.curatorStatus] ?? "text-mist"}`}>
                  {entry.curatorStatus}
                </span>
              </div>
              <h1 className="headline mt-4">{entry.title}</h1>
              <p className="mt-3 text-sm uppercase tracking-[0.18em] text-gold">{entry.room.title}</p>
            </div>
            <div className="text-right text-xs text-mist/70">
              <p>{new Date(entry.createdAt).toLocaleDateString("pl-PL")}</p>
              {entry.viewCount > 0 && <p className="mt-1">{entry.viewCount} odslony</p>}
            </div>
          </div>

          {/* Content */}
          <div className="copy mt-8 max-w-3xl whitespace-pre-wrap">{entry.content}</div>

          {/* Tags */}
          {entry.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {entry.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/absolut?tag=${encodeURIComponent(tag)}`}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-mist transition-colors hover:border-white/30 hover:text-white"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {/* Back */}
          <div className="mt-12 border-t border-white/10 pt-8">
            <Link href="/absolut" className="action-secondary">
              Wróc do ABSOLUT
            </Link>
          </div>
        </div>
      </article>
    </PageShell>
  );
}
