import { PageShell } from "@/components/layout/PageShell";
import { RoomCard } from "@/components/rooms/RoomCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getRooms } from "@/lib/data/repository";

export default async function RoomsPage() {
  const rooms = await getRooms();

  return (
    <PageShell>
      <section className="content-wrap">
        <div className="panel p-8 sm:p-10">
          <SectionHeading
            eyebrow="Rooms"
            title="Interaktywne pokoje doswiadczen"
            copy="Kazdy pokoj ma odrebna os znaczeniowa, publiczny widok i prywatna warstwe danych dla ownera."
          />
        </div>
      </section>

      <section className="content-wrap mt-6">
        <div className="card-grid">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      </section>
    </PageShell>
  );
}
