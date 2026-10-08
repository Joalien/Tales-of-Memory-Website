import data from '../data/shows.json';

export type Show = {
  slug: string;
  uid: string | null;
  venue: string;
  city: string;
  address: string;
  ticketsUrl: string;
  price: string;
  lineup: string;
  day: string;
  startsAt: string;
  overAt: string;
  allDay: boolean;
};

const all = (data.shows as Show[]) ?? [];
const now = Date.now();

/** Un concert reste « à venir » jusqu'à sa fin, pas jusqu'à son début. */
export const upcoming: Show[] = all
  .filter((s) => Date.parse(s.overAt) >= now)
  .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

export const past: Show[] = all
  .filter((s) => Date.parse(s.overAt) < now)
  .sort((a, b) => b.startsAt.localeCompare(a.startsAt));

export const nextShow: Show | undefined = upcoming[0];
export const generatedAt: string = data.generatedAt;
export const showBySlug = (slug: string) => all.find((s) => s.slug === slug);
