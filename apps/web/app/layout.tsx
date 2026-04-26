import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Nav } from "./components/Nav";
import { AppProviders } from "./components/AppProviders";

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
  title: "Kino — Culture Connect",
  description:
    "Discover, rate and share movies and TV shows. A cinematic social library.",
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
          <Nav />
          <main className="mx-auto max-w-7xl px-4 pb-20 pt-4 md:px-6 md:pt-6">
            {children}
          </main>
        </AppProviders>
      </body>
    </html>
  );
}
