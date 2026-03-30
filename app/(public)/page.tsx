import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getAbsolutEntries, getRooms } from "@/lib/data/repository";

import { RoomCard } from "@/features/rooms/ui/RoomCard";

export default async function HomePage() {
  const [rooms, absolutEntries] = await Promise.all([getRooms(), getAbsolutEntries()]);

  return (
    <PageShell>
      <section className="content-wrap">
        <div className="panel px-6 py-10 sm:px-10 sm:py-14">
          <span className="eyebrow">Global Vision</span>
          <h1 className="headline mt-4">Twoje okno na META-GENIUSZ System.</h1>
          <p className="copy mt-5 max-w-3xl">
            Global Vision laczy branding, pokoje tematyczne, prywatne rozmowy AI i warstwe publikacji.
            ABSOLUT dziala tutaj jako agregator zatwierdzonych tresci, a nie dekoracyjna podstrona.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/absolut" className="action-primary">
              Wejdz do ABSOLUTU
            </Link>
            <Link href="/rooms" className="action-secondary">
              Zobacz pokoje
            </Link>
            <Link href="/login?next=%2Fmember%2Frooms%2Fabsolut" className="action-secondary">
              Logowanie
            </Link>
          </div>
        </div>
      </section>

      <section className="content-wrap mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="panel p-8">
          <SectionHeading
            eyebrow="O marce"
            title="ABSOLUT jako serce systemu"
            copy="Kazdy pokoj generuje prywatna warstwe wpisow i dialogow AI. Dopiero zatwierdzone fragmenty sa agregowane do publicznego widoku ABSOLUT, co oddziela publike od prywatnego procesu ownera."
          />
        </div>
        <div className="panel p-8">
          <SectionHeading
            eyebrow="Szybki podglad"
            title="Co juz jest modelowane"
            copy={`Pokoi demo: ${rooms.length}. Publicznych wpisow widocznych w ABSOLUT: ${absolutEntries.length}. Role systemowe: guest, owner, curator, admin.`}
          />
        </div>
      </section>

      <section className="content-wrap mt-6">
        <SectionHeading
          eyebrow="Pokoje"
          title="Tematyczne zrodla tresci"
          copy="Kazdy pokoj ma osobny slug, misje, styl, publiczny widok read-only i prywatna warstwe ownera."
        />
        <div className="card-grid mt-8">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      </section>
    </PageShell>
  );
}
