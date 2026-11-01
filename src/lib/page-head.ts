export const pageHead = (title: string, description: string) => ({meta: [
  { title: `${title} · KUMO` },
  { name: 'description', content: description },
  { property: 'og:title', content: `${title} · KUMO` },
  { property: 'og:description', content: description },
  { property: 'og:type', content: 'website' },
  { name: 'twitter:card', content: 'summary_large_image' },
]});