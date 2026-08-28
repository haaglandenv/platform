import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Haaglanden Voetbal TournamentOS",
    short_name: "HV Next",
    description: "Publiek voetbal, bekers en wedstrijdoperatie in één platform.",
    start_url: "/next",
    display: "standalone",
    background_color: "#F7F8F6",
    theme_color: "#003D1D",
    icons: [{ src: "/brand/club-placeholder.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
