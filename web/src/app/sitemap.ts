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
      url: `${SITE_URL}/discover`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  let characterRoutes: MetadataRoute.Sitemap = [];
  try {
    const characters = await prisma.character.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    });

    characterRoutes = characters.map((char) => ({
      url: `${SITE_URL}/c/${char.slug}`,
      lastModified: char.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    // DB may not be available at build time
  }

  return [...staticRoutes, ...characterRoutes];
}
