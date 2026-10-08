import type { APIRoute } from 'astro';
import { site } from '../data/site';
import { upcoming } from '../lib/shows';
import { longDate } from '../lib/format';

const escape = (str: string) =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Flux RSS des prochaines dates, pratique pour la presse et les agrégateurs. */
export const GET: APIRoute = () => {
  const items = upcoming
    .map((show) => {
      const title = `${show.venue}${show.city ? ` — ${show.city}` : ''}`;
      const body = [longDate(show.startsAt), show.address, show.price && `Tarif : ${show.price}`, show.lineup && `Avec ${show.lineup}`]
        .filter(Boolean)
        .join(' · ');
      return `    <item>
      <title>${escape(title)}</title>
      <link>${escape(show.ticketsUrl || `${site.domain}/concerts`)}</link>
      <guid isPermaLink="false">${escape(show.slug)}</guid>
      <pubDate>${new Date(show.startsAt).toUTCString()}</pubDate>
      <description>${escape(body)}</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escape(`${site.name} — concerts`)}</title>
    <link>${site.domain}/concerts</link>
    <description>${escape(`Les prochaines dates de ${site.name}.`)}</description>
    <language>fr</language>
${items}
  </channel>
</rss>
`;

  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};
