# stxphanie.com

Personal site. Astro 7, static pages plus one serverless function, deployed on Vercel.

## Commands

```sh
npm install
npm run dev       # http://localhost:4321
npm run build     # astro check + astro build
npm run preview
npm run shoot:demo  # re-shoot the Baby Steps thumbnail
```

## Layout

```
src/
  styles/tokens.css        design tokens — the source of truth for colour, type, space, motion
  styles/global.css        reset, text links, the load-in "rise", reduced-motion rules
  data/site.ts             home-page copy, career, links
  content/work/*.yaml      case studies (one file each)
  content.config.ts        the case-study schema and its content blocks
  assets/                  images and video, referenced by path from content
  components/              one component per piece in design/components.md
  layouts/                 BaseLayout (head, fonts, feedback dialog) and CaseStudyLayout (rail + scroll-spy)
  pages/index.astro        home
  pages/work/[slug].astro  case study
  pages/api/feedback.ts    anonymous feedback endpoint (serverless)
design/                    the design handoff, for reference only (not built)
```

## Adding a case study

Add `src/content/work/<slug>.yaml`; it's published at `/work/<slug>`. `order` sets its
position on the home page. Each section has a `title`, an optional `lede` (the accent
skim line), and a list of `blocks`:

| type        | fields                                                         |
| ----------- | -------------------------------------------------------------- |
| `prose`     | `text` — a string or a list of paragraphs                       |
| `figure`    | `src`, `alt`, `caption?`, `ratio?`                              |
| `inset`     | `figure`, `text` — small image beside a paragraph               |
| `callout`   | `label`, `text`                                                 |
| `quote`     | `text`                                                          |
| `statement` | `text`                                                          |
| `label`     | `text` — a small uppercase heading                              |
| `list`      | `items`, `style?` (`plain`, `ruled`, `large`)                   |
| `diagram`   | `left`/`right` (`label`, `role`, `items`), `exchange`, `caption?` |
| `group`     | `label?`, `rule?`, `blocks` — a sub-section                     |

Text fields accept `**bold**`, `[links](https://…)` and line breaks.

## Images

Paths in content are relative to `src/`, e.g. `assets/waymo-labeling-requests/hero.png`.
Images are optimised at build time; `.mp4`/`.webm` play muted on loop. A path with no
file yet shows a dashed placeholder in dev and is left out of production builds (the
build logs a warning), so you can write first and drop files in later.

## The Baby Steps thumbnail

`npm run shoot:demo` drives headless Chrome to <https://baby-steps.stxphanie.com/demo>,
removes the "This is a demo." banner so the capture starts at the app's real top edge,
and writes `src/assets/baby-steps/app-screenshot.png` at a pinned 1440x900 @2x. Run it
whenever Baby Steps changes; the framing stays identical, so only the app moves.

It refuses to write if it cannot find the banner, rather than shipping a thumbnail with
one on it — if the banner's copy changes, update `BANNER_TEXT` in `scripts/shoot-demo.mjs`.

## Feedback endpoint

`POST /api/feedback` with `{ "note": "…" }`. Notes are appended to a Redis list named
`feedback` on [Upstash](https://upstash.com) — only the text is stored. Each IP gets 5
notes an hour, tracked in memory only.

1. Create a free Upstash Redis database and copy its **REST URL** and **REST token**.
2. Put them in `.env` locally (see `.env.example`) and in Vercel → Project → Settings →
   Environment Variables as `FEEDBACK_REDIS_URL` and `FEEDBACK_REDIS_TOKEN`.
3. Read notes from the Upstash console with `LRANGE feedback 0 -1`.

Without those variables, dev logs notes to the terminal and production returns 503.

## Deploying

Push to GitHub, import the repo in Vercel (it detects Astro), add the two environment
variables, deploy. Point `stxphanie.com` at it under Settings → Domains.

## To do

- Replace the two outdated YouTube screenshots (`prototype-editor`, `prototype-preview`).
- The feedback dialog promises weekly batched delivery; that's not built yet — for now,
  read the list in Upstash.
