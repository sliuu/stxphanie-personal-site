// Site-wide copy and links that aren't case studies.

export const site = {
  name: 'Stephanie Liu', // nav wordmark (CSS sets the caps), tab title, footer
  description: 'Stephanie — a product designer who engineers. Case studies from Google and Waymo, and things I’ve made.',
  email: 'stxphanieliu@gmail.com',
  // Served from public/ rather than bundled: the URL is stable across rebuilds,
  // so a link already out in the world keeps working when the PDF is replaced.
  // The filename is the download name — keep it self-identifying.
  resumeHref: '/stephanie-liu-resume.pdf',
  linkedinHref: 'https://www.linkedin.com/in/stephanieliu14',
  githubHref: 'https://github.com/sliuu',
  repoHref: 'https://github.com/sliuu/stxphanie-personal-site',
};

export const hero = {
  greeting: 'Hi! I’m Stephanie.',
  lead: 'I’m a',
  // Click the accent word to cycle. It sits mid-sentence now, so Hero animates
  // its width on each swap — keep these close in length and they stay tidy.
  roles: ['design engineer', 'UX engineer', 'product designer'],
  // The gap in "San Francisco" is an escaped U+00A0, not a plain space.
  // The role word changes width on every click, which moves the wrap point,
  // and a plain space lets the line break as "San / Francisco." on some of
  // the three. Escaped rather than a literal character so it stays visible.
  trail: 'based in San\u00A0Francisco',
};

export const career = [
  { period: '2025 —', org: 'Sabbatical', role: 'Rest, reflection & writing' },
  { period: '2025', org: 'Google', role: 'UX Engineer' },
  { period: '2022 — 25', org: 'Waymo', role: 'SWE & UX Research (20%)' },
  { period: '2021 — 22', org: 'Nuro', role: 'SWE & Analytics Engineer' },
  { period: '2018 — 21', org: 'Google', role: 'SWE' },
];

export const project = {
  statement: 'Habits that get built by doing a thing over time, not every day.',
  emphasis: 'over time',
  body: 'Built a habit tracker that only asks whether you showed up. No hours, no finished projects, no streak to break, no to-do lists. Simple and satisfying by design. Built with Next.js, React, TypeScript, Tailwind and Supabase. Hosted on Vercel, source on GitHub.',
  // The app, not the demo — the demo is linked from it.
  liveHref: 'https://baby-steps.stxphanie.com',
  liveLabel: 'Baby Steps',
  // The accordion row reads "BABY STEPS · 2026"; the note sits beside the link.
  year: '2026',
  note: 'Built & shipped solo',
  // Regenerate with `npm run shoot:demo` whenever Baby Steps changes — the
  // accordion crops this to a top-left band, so the framing has to stay put.
  image: {
    src: 'assets/baby-steps/app-screenshot.png',
    alt: 'The Baby Steps habit tracker, showing a month of stickers',
  },
};

export const statements = {
  items: [
    {
      label: 'Currently',
      text: 'On a sabbatical through late 2026 — resting, reading, learning, building. Looking for good work with good people.',
    },
    {
      label: 'Also loving',
      text: 'Organizing everything, unconventional furniture, fiber arts, and thinking about people.',
    },
  ],
  image: { src: 'assets/home/portrait-sf-roof.jpg', alt: 'Stephanie on a San Francisco roof' },
};
