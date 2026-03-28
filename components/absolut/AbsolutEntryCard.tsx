import Link from "next/link";
type AbsolutEntryCardProps = {
  title: string;
  content: string;
  roomTitle: string;
  visibility: string;
  featuredLevel?: number;
  curatorStatus?: string;
  pinned?: boolean;
  tags?: string[];
  href?: string;
};

export function AbsolutEntryCard(props: AbsolutEntryCardProps) {
  const { title, content, roomTitle, visibility, featuredLevel = 0, curatorStatus, pinned = false, tags = [], href } = props;
  return (
    <article className="data-card h-full flex flex-col group relative">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="eyebrow">{visibility}</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {pinned && (
            <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-gold">
              przypiety
            </span>
          )}
          {curatorStatus === "featured" && (
            <span className="rounded-full border border-aura/40 bg-aura/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-aura">
              featured
            </span>
          )}
          {featuredLevel > 0 && (
            <span className="rounded-full border border-white/15 bg-black/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-mist">
              lvl {featuredLevel}
            </span>
          )}
        </div>
      </div>
      <h3 className="mt-4 text-2xl font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm uppercase tracking-[0.18em] text-gold">{roomTitle}</p>
      <p className="copy mt-4 flex-1">{content}</p>
      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] text-mist"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
      {href && (
        <Link
          href={href}
          className="absolute inset-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-aura/50"
          aria-label={`Czytaj: ${title}`}
        />
      )}
    </article>
  );
}

