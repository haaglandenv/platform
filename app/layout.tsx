import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://haag.dgwebservices.nl";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Haaglanden Voetbal TournamentOS", template: "%s · TournamentOS" },
  description: "Het complete regionale voetbalplatform voor Haaglanden.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "nl_NL",
    url: "/",
    siteName: "Haaglanden Voetbal TournamentOS",
    title: "Haaglanden Voetbal TournamentOS",
    description: "Het complete regionale voetbalplatform voor Haaglanden.",
    images: [
      {
        url: "/media/social-preview.png",
        width: 1730,
        height: 909,
        alt: "Haaglanden Voetbal TournamentOS bij een regionaal voetbalveld",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/media/social-preview.png"],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#003D1D",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
