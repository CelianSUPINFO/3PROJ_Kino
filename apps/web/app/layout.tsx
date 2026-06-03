import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Nav } from "./components/Nav";
import { AppProviders } from "./components/AppProviders";
import { PwaRegister } from "./components/PwaRegister";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://kino-web-ten.vercel.app"),
  title: {
    default: "Kino — Films, séries et critiques",
    template: "%s | Kino",
  },
  description:
    "Découvrez, notez et partagez films et séries avec la communauté Kino.",
  applicationName: "Kino",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/kino-mark.png",
    apple: "/kino-logo.png",
  },
  openGraph: {
    title: "Kino — Films, séries et critiques",
    description: "Construisez votre bibliothèque cinéma et partagez vos critiques.",
    type: "website",
    locale: "fr_FR",
    images: ["/kino-logo.png"],
  },
  twitter: {
    card: "summary",
    title: "Kino — Films, séries et critiques",
    description: "Construisez votre bibliothèque cinéma et partagez vos critiques.",
    images: ["/kino-logo.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0710",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${playfair.variable} min-h-screen bg-kino-ink text-kino-fg font-sans antialiased`}
      >
        <AppProviders>
          <PwaRegister />
          <Nav />
          <main className="mx-auto max-w-7xl px-4 pb-20 pt-4 md:px-6 md:pt-6">
            {children}
          </main>
          <footer className="mx-auto flex max-w-7xl flex-wrap justify-center gap-4 px-4 pb-8 text-xs text-kino-muted">
            <a href="/legal" className="hover:text-kino-hot">Mentions légales</a>
            <a href="/privacy" className="hover:text-kino-hot">Confidentialité</a>
            <a href="/terms" className="hover:text-kino-hot">Conditions d’utilisation</a>
          </footer>
        </AppProviders>
      </body>
    </html>
  );
}
