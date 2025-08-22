import ScoreGameInterface from '@/components/anotador/ScoreGameInterface';

interface PageProps {
  params: Promise<{
    gameId: string;
  }>;
}

export default async function GameScorePage({ params }: PageProps) {
  const { gameId } = await params;
  return <ScoreGameInterface gameId={gameId} />;
}