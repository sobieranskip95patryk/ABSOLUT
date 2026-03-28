import { AbsolutEntryCard } from "@/components/absolut/AbsolutEntryCard";
import { PageShell } from "@/components/layout/PageShell";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getAbsolutEntries } from "@/lib/data/repository";

export default async function AbsolutPage() {
  const entries = await getAbsolutEntries();

  return (
    <PageShell>
      <section className="content-wrap">
        <div className="panel p-8 sm:p-10">
          <SectionHeading
            eyebrow="ABSOLUT"
            title="Biblioteka Najwyzszej Jakosci Inspiracji"
            copy="Publiczny widok pokazuje tylko tresci approved, curated_public i public_room. Prywatne watki pokojow nie sa tutaj widoczne."
          />
        </div>
      </section>

      <section className="content-wrap mt-6">
        <div className="card-grid">
          {entries.map((entry) => (
            <AbsolutEntryCard
              key={entry.id}
              title={entry.title}
              content={entry.content}
              roomTitle={entry.room.title}
              visibility={entry.visibility}
            />
          ))}
        </div>
      </section>
    </PageShell>
  );
}
