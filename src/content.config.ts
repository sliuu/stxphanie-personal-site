import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const figure = z.object({
  src: z.string(), // relative to src/, e.g. assets/home/portrait-sf-roof.jpg
  alt: z.string(),
  caption: z.string().optional(),
  ratio: z.string().optional(), // e.g. "16/9"; reserves height while an asset is pending
});

const diagramSide = z.object({
  label: z.string(),
  role: z.string(),
  items: z.array(z.string()),
});

const leafBlocks = [
  z.object({ type: z.literal('prose'), text: z.union([z.string(), z.array(z.string())]) }),
  figure.extend({ type: z.literal('figure') }),
  z.object({ type: z.literal('inset'), figure, text: z.string() }),
  z.object({ type: z.literal('callout'), label: z.string(), text: z.string() }),
  z.object({ type: z.literal('quote'), text: z.string() }),
  z.object({ type: z.literal('statement'), text: z.string() }),
  z.object({ type: z.literal('label'), text: z.string() }),
  z.object({
    type: z.literal('list'),
    style: z.enum(['plain', 'ruled', 'large']).default('plain'),
    items: z.array(z.string()),
  }),
  z.object({ type: z.literal('processFlow'), caption: z.string().optional() }),
  z.object({
    type: z.literal('diagram'),
    left: diagramSide,
    right: diagramSide,
    exchange: z.object({ toLeft: z.string(), toRight: z.string() }),
    caption: z.string().optional(),
  }),
] as const;

// A group is a sub-section inside a section (e.g. "PASS ONE — …"): an optional
// label and a soft top rule around a run of leaf blocks.
const group = z.object({
  type: z.literal('group'),
  label: z.string().optional(),
  rule: z.boolean().default(true),
  blocks: z.array(z.discriminatedUnion('type', [...leafBlocks])),
});

const block = z.discriminatedUnion('type', [...leafBlocks, group]);

const work = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/work' }),
  schema: z.object({
    title: z.string(),
    org: z.string(),
    year: z.string(),
    order: z.number(),
    // Home accordion
    cardTitle: z.string(),
    summary: z.string(),
    thumb: z.string(),
    thumbAlt: z.string(),
    // Case study page
    dek: z.string(),
    team: z.string(),
    role: z.string(),
    timeline: z.string(),
    tools: z.string(),
    prototypeHref: z.string().optional(),
    prototypeNote: z.string().optional(),
    confidentialityNote: z.string().optional(),
    hero: figure.optional(),
    sections: z.array(
      z.object({
        id: z.string().optional(), // defaults to a slug of the title
        title: z.string(),
        lede: z.string().optional(),
        blocks: z.array(block),
      }),
    ),
  }),
});

export const collections = { work };
