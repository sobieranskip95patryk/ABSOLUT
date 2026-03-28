import { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-aura">
      <SiteHeader />
      <main className="pb-12 pt-8">{children}</main>
      <SiteFooter />
    </div>
  );
}
