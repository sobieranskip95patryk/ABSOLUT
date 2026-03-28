import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { getRoomBySlug, getRooms } from "@/lib/data/repository";

export async function generateStaticParams() {
  const rooms = await getRooms();
  return rooms.map((room) => ({ slug: room.slug }));
}

export default async function RoomStoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const room = await getRoomBySlug(slug);
  if (!room) notFound();

  return (
    <PageShell>
      <section className="content-wrap">
        <div className="panel p-8 sm:p-10">
          <span className="eyebrow">/rooms/{room.slug}/story</span>
          <h1 className="headline mt-4">Story - {room.title}</h1>
          <p className="copy mt-5 max-w-3xl">
            Ten widok opisuje geneze pokoju, jego misje i sposob, w jaki prywatne rozmowy AI sa destylowane do warstwy publicznej.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <article className="data-card">
              <h2 className="text-xl font-semibold text-white">Misja</h2>
              <p className="copy mt-3">{room.mission}</p>
            </article>
            <article className="data-card">
              <h2 className="text-xl font-semibold text-white">Odcisk wizualny</h2>
              <p className="copy mt-3">{room.visualStyle}</p>
            </article>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
