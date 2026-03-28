import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { getRoomBySlug, getRoomPublicEntries, getRooms } from "@/lib/data/repository";

export async function generateStaticParams() {
  const rooms = await getRooms();
  return rooms.map((room) => ({ slug: room.slug }));
}

export default async function RoomReadonlyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const room = await getRoomBySlug(slug);
  if (!room) notFound();

  const entries = await getRoomPublicEntries(slug);

  return (
    <PageShell>
      <section className="content-wrap">
        <div className="panel p-8 sm:p-10">
          <span className="eyebrow">/rooms/{room.slug}/ai-readonly</span>
          <h1 className="headline mt-4">AI read-only - {room.title}</h1>
          <p className="copy mt-5 max-w-3xl">
            Publiczny odbiorca widzi tutaj tylko wpisy oznaczone jako public_room albo curated_public.
            Prywatne dialogi pozostaja poza tym widokiem.
          </p>
        </div>
      </section>

      <section className="content-wrap mt-6 space-y-4">
        {entries.map((entry) => (
          <article key={entry.id} className="panel p-6">
            <span className="eyebrow">{entry.visibility}</span>
            <h2 className="mt-4 text-2xl font-semibold text-white">{entry.title}</h2>
            <p className="copy mt-4">{entry.content}</p>
          </article>
        ))}
      </section>
    </PageShell>
  );
}
