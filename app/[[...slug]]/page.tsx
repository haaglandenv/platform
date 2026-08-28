import { TournamentOS } from "@/components/TournamentOS";

export default async function ProductPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params;
  return <TournamentOS path={`/${slug.join("/")}`} />;
}
