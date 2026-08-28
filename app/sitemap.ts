import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://haag.dgwebservices.nl";
const routes = [
  "",
  "/nieuws",
  "/wedstrijden",
  "/wedstrijden/quick-duindorp-sv",
  "/toernooien",
  "/toernooien/sir-winston-cup",
  "/toernooien/sir-winston-cup/programma",
  "/toernooien/sir-winston-cup/bracket",
  "/toernooien/sir-winston-cup/teams",
  "/toernooien/sir-winston-cup/statistieken",
  "/toernooien/sir-winston-cup/nieuws",
  "/toernooien/sir-winston-cup/reglement",
  "/clubs",
  "/clubs/duindorp-sv",
  "/media",
  "/historie",
  "/finaledag",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({ url: `${siteUrl}${route}`, changeFrequency: "weekly" }));
}
