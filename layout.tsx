import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pesquisa Eleitoral — Deputado Federal ES",
  description: "Aplicativo de coleta de intenção de voto para deputado federal no Espírito Santo.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
