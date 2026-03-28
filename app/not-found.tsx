import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";

export default function NotFound() {
  return (
    <PageShell>
      <section className="content-wrap">
        <div className="panel p-10 text-center">
          <span className="eyebrow">404</span>
          <h1 className="headline mt-4">Nie znaleziono tej przestrzeni.</h1>
          <p className="copy mx-auto mt-4 max-w-2xl">
            Sprawdz adres URL albo wroc do glownej osi systemu Global Vision.
          </p>
          <Link href="/" className="action-primary mt-8">
            Wroc na start
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
