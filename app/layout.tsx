import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.mtaquestwebsidex.com"),
  title: {
    default: "Global Vision",
    template: "%s | Global Vision",
  },
  description: "Global Vision na platformie mtaquestwebsidex.com - ABSOLUT, pokoje tematyczne i warstwy prywatnosci systemu.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
