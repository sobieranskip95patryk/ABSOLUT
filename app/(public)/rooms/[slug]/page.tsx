import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { getRoomBySlug, getRoomPublicEntries, getRooms } from "@/lib/data/repository";

export async function generateStaticParams() {
  const rooms = await getRooms();
  return rooms.map((room) => ({ slug: room.slug }));
}

export default async function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const room = await getRoomBySlug(slug);
  if (!room) notFound();

  const publicEntries = await getRoomPublicEntries(slug);

  return (
    <PageShell>
      <section className="content-wrap">
        <div className="panel p-8 sm:p-10">
          <span className="eyebrow">/rooms/{room.slug}</span>
          <h1 className="headline mt-4">{room.title}</h1>
          <p className="mt-3 text-sm uppercase tracking-[0.18em] text-gold">{room.theme}</p>
          <p className="copy mt-5 max-w-3xl">{room.mission}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/rooms/${room.slug}/story`} className="action-secondary">
              Story
            </Link>
            <Link href={`/rooms/${room.slug}/ai-readonly`} className="action-secondary">
              AI read-only
            </Link>
            <Link href={`/member/rooms/${room.slug}`} className="action-secondary">
              Widok ownera
            </Link>
          </div>
        </div>
      </section>

      <section className="content-wrap mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="panel p-8">
          <h2 className="text-2xl font-semibold text-white">Publiczne wpisy pokoju</h2>
          <div className="mt-6 space-y-4">
            {publicEntries.map((entry) => (
              <article key={entry.id} className="data-card">
                <span className="eyebrow">{entry.visibility}</span>
                <h3 className="mt-4 text-xl font-semibold text-white">{entry.title}</h3>
                <p className="copy mt-3">{entry.content}</p>
              </article>
            ))}
          </div>
        </div>
        <aside className="panel p-8">
          <h2 className="text-2xl font-semibold text-white">Parametry pokoju</h2>
          <dl className="mt-6 space-y-4 text-sm text-mist">
            <div>
              <dt className="uppercase tracking-[0.18em] text-gold">Styl wizualny</dt>
              <dd className="mt-1 leading-7">{room.visualStyle}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-[0.18em] text-gold">QR URL</dt>
              <dd className="mt-1 break-all leading-7">{room.qrCodeUrl}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-[0.18em] text-gold">Warstwa publiczna</dt>
              <dd className="mt-1 leading-7">Read-only dla guest. Pelna warstwa prywatna dopiero w strefie ownera.</dd>
            </div>
          </dl>
        </aside>
      </section>
    </PageShell>
  );
}
