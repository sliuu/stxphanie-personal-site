import type { ImageMetadata } from 'astro';

const images = import.meta.glob<{ default: ImageMetadata }>('/src/assets/**/*.{png,jpg,jpeg,webp,avif,gif}', {
  eager: true,
});
const videos = import.meta.glob<string>('/src/assets/**/*.{mp4,webm,mov}', {
  eager: true,
  query: '?url',
  import: 'default',
});

export type Asset =
  | { status: 'image'; image: ImageMetadata }
  | { status: 'video'; url: string }
  | { status: 'pending'; path: string };

/** Pending assets render as labelled placeholders in dev and are omitted from production builds. */
export const showPending = import.meta.env.DEV;

const warned = new Set<string>();

/**
 * Resolve a content path like `assets/home/portrait-sf-roof.jpg` (relative to
 * src/) to a bundled asset. Paths with no file behind them are "pending": the
 * handoff lists them as intentional dead references to be filled later.
 */
export function resolveAsset(path: string): Asset {
  const key = `/src/${path.replace(/^\/+/, '')}`;
  const image = images[key];
  if (image) return { status: 'image', image: image.default };
  const video = videos[key];
  if (video) return { status: 'video', url: video };

  if (!showPending && !warned.has(path)) {
    warned.add(path);
    console.warn(`[assets] pending, left out of this build: src/${path}`);
  }
  return { status: 'pending', path };
}
