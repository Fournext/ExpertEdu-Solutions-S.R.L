import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const recursos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/recursos' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(['Artículos', 'Tutoriales', 'Guías']),
    publishedAt: z.string(),
    readingTime: z.string(),
  }),
});

export const collections = { recursos };
