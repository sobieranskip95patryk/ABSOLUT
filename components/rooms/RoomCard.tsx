import Link from "next/link";
import { Room } from "@/lib/data/types";

export function RoomCard({ room }: { room: Room }) {
  return (
    <article className="data-card flex h-full flex-col justify-between">
      <div>
        <span className="eyebrow">/rooms/{room.slug}</span>
        <h3 className="mt-4 text-2xl font-semibold text-white">{room.title}</h3>
        <p className="mt-3 text-sm uppercase tracking-[0.18em] text-gold">{room.theme}</p>
        <p className="copy mt-4">{room.publicSummary}</p>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={`/rooms/${room.slug}`} className="action-secondary">
          Szczegoly
        </Link>
        <Link href={`/rooms/${room.slug}/ai-readonly`} className="action-secondary">
          AI read-only
        </Link>
      </div>
    </article>
  );
}
