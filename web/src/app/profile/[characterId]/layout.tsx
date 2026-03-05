import type { Metadata } from 'next';

interface Props {
  params: Promise<{ characterId: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { characterId } = await params;

  let characterName = 'キャラクター';
  let description = 'ANIVAでこのキャラクターと話してみよう。';
  let avatarUrl: string | null = null;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3050';
    const res = await fetch(`${baseUrl}/api/characters/id/${characterId}`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.character) {
        characterName = data.character.name;
        avatarUrl = data.character.avatarUrl;
        const traits = (data.character.personalityTraits ?? []).slice(0, 3).join('・');
        description = traits
          ? `${characterName}（${data.character.franchise ?? 'ANIVA'}）。${traits}。ANIVAで${characterName}と本当に会話しよう。`
          : `${data.character.franchise ?? 'ANIVA'}の${characterName}。ANIVAで推しとリアルな会話を体験しよう。`;
      }
    }
  } catch {
    // fallback to defaults
  }

  const pageUrl = `https://aniva-project.com/profile/${characterId}`;

  return {
    title: `${characterName} — ANIVA`,
    description,
    openGraph: {
      title: `${characterName} — ANIVA`,
      description,
      url: pageUrl,
      siteName: 'ANIVA',
      type: 'profile',
      locale: 'ja_JP',
      images: avatarUrl
        ? [{ url: avatarUrl, width: 400, height: 400, alt: characterName }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${characterName} — ANIVA`,
      description,
    },
    alternates: {
      canonical: pageUrl,
    },
  };
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
