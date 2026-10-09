import type { APIRoute } from 'astro';
import { site } from '../data/site';
import { upcoming } from '../lib/shows';
import { posterFor, absoluteSrc } from '../lib/photos';
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
      // L'affiche voyage avec la date : c'est ce qu'un agrégateur ou une
      // rédaction affichera. Adresse complète obligatoire, le flux étant lu
      // ailleurs que sur le site.
      const poster = posterFor(show.slug);
      const enclosure = poster
        ? `\n      <enclosure url="${escape(absoluteSrc(poster.gallery, poster.photo.id, 1600, site.domain))}" type="image/webp" length="0" />`
        : '';
      return `    <item>
      <title>${escape(title)}</title>
      <link>${escape(show.ticketsUrl || `${site.domain}/concerts`)}</link>
      <guid isPermaLink="false">${escape(show.slug)}</guid>
      <pubDate>${new Date(show.startsAt).toUTCString()}</pubDate>
      <description>${escape(body)}</description>${enclosure}
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
