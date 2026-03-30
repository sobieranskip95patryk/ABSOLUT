import { PageShell } from "@/components/layout/PageShell";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RoomCard } from "@/features/rooms/ui/RoomCard";
import { getRooms } from "@/features/rooms/data/queries";

export default async function RoomsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const rooms = await getRooms();
  const params = await searchParams;
  const query = (params?.q ?? "").trim().toLowerCase();
  const filtered = query
    ? rooms.filter((r) => r.title.toLowerCase().includes(query) || r.publicSummary.toLowerCase().includes(query))
    : rooms;

  return (
    <PageShell>
      <section className="content-wrap">
        <div className="panel p-8 sm:p-10">
          <SectionHeading
            eyebrow="Rooms"
            title="Interaktywne pokoje doswiadczen"
            copy="Kazdy pokoj ma odrebna os znaczeniowa, publiczny widok i prywatna warstwe danych dla ownera."
          />

          <form method="get" action="/rooms" className="mt-8">
            <div className="flex gap-2">
              <input
                type="search"
                name="q"
                defaultValue={params?.q ?? ""}
                placeholder="Filtruj pokoje..."
                className="flex-1 rounded-full border border-white/20 bg-black/20 px-5 py-2.5 text-sm text-white placeholder:text-mist/60 outline-none focus:border-aura/50"
              />
              <button type="submit" className="action-secondary">Szukaj</button>
            </div>
          </form>
        </div>
      </section>

      <section className="content-wrap mt-6">
        <div className="card-grid">
          {filtered.length === 0 ? (
            <p className="copy col-span-full text-center">Brak pokojow pasujacych do zapytania.</p>
          ) : filtered.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      </section>
    </PageShell>
  );
}
