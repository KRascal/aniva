import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXTAUTH_URL ??
  "https://aniva-project.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/explore`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/discover`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/moments`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/events`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/story`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/ranking`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.75,
    },
    {
      url: `${SITE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  let characterRoutes: MetadataRoute.Sitemap = [];
  let storyRoutes: MetadataRoute.Sitemap = [];
  let rankingRoutes: MetadataRoute.Sitemap = [];

  try {
    const characters = await prisma.character.findMany({
      where: { isActive: true },
      select: { slug: true, id: true, updatedAt: true },
    });

    // キャラクタープロフィールページ
    characterRoutes = characters.map((char) => ({
      url: `${SITE_URL}/c/${char.slug}`,
      lastModified: char.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    // ストーリーページ（キャラ別）
    storyRoutes = characters.map((char) => ({
      url: `${SITE_URL}/story/${char.id}`,
      lastModified: char.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    // ランキングページ（キャラ別）
    rankingRoutes = characters.map((char) => ({
      url: `${SITE_URL}/ranking/${char.id}`,
      lastModified: char.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.6,
    }));
  } catch {
    // DB may not be available at build time
  }

  return [...staticRoutes, ...characterRoutes, ...storyRoutes, ...rankingRoutes];
}
