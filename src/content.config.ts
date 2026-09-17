import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// News posts live in src/content/news/*.md. The /admin page writes these files
// into the repo through the GitHub API; you can also add them by hand.
const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tag: z.string().default('Team'),
    excerpt: z.string().default(''),
    image: z.string().optional(),      // path under /public, e.g. /news/2026-09-17-opener/photo.jpg
    imageAlt: z.string().optional(),
    author: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { news };
