/**
 * Tout le contenu éditorial du site vit ici.
 *
 * Les valeurs actuelles sont du contenu bouchon : remplace-les et le site se
 * met à jour partout. Un lien laissé vide est simplement masqué, rien ne casse.
 */

export const site = {
  name: 'Tales of Memory',
  /** Sous-titre affiché sous le nom, et genre utilisé pour le référencement. */
  tagline: 'Metal progressif atmosphérique',          // À REMPLACER
  city: 'Région parisienne',                           // à préciser si tu veux une ville
  foundedYear: 2019,                                   // À REMPLACER
  domain: 'https://www.talesofmemory.com',
  /** Phrase unique reprise dans les métadonnées et les partages sur réseaux. */
  summary:
    'Tales of Memory est un groupe de metal progressif atmosphérique. Récits intimes, ' +
    'guitares denses et nappes orchestrales.',          // À REMPLACER

  /** Biographie : un élément du tableau = un paragraphe. */
  bio: [
    'Tales of Memory est né en région parisienne en 2019 de l’envie de raconter des histoires longues, ' +
      'celles qui demandent dix minutes pour être dites. Le groupe cherche moins la performance ' +
      'que la sensation d’un souvenir qui remonte.',
    'Après deux années passées à écrire en répétition, le groupe sort un premier EP et commence ' +
      'à défendre ces morceaux sur scène, d’abord en région puis en tournée.',
    'Le projet avance aujourd’hui vers un premier album, plus sombre et plus large, où l’orchestre ' +
      'ne décore pas la musique mais la porte.',
  ],                                                   // À REMPLACER

  // Cinq emplacements : c'est le nombre de personnes sur la photo promo.
  members: [
    { name: 'Prénom Nom', role: 'Chant' },
    { name: 'Prénom Nom', role: 'Guitare' },
    { name: 'Prénom Nom', role: 'Guitare' },
    { name: 'Prénom Nom', role: 'Basse' },
    { name: 'Prénom Nom', role: 'Batterie' },
  ],                                                   // À REMPLACER

  /**
   * Une seule adresse, parce que c'est la seule boîte réellement routée par
   * Cloudflare. N'en ajoute pas ici (booking@, presse@…) sans créer d'abord la
   * règle de redirection correspondante, sinon les messages rebondissent.
   */
  email: 'contact@talesofmemory.com',

  /** Lien vide = masqué sur le site. */
  links: [
    { label: 'Bandcamp', url: '' },
    { label: 'Spotify', url: '' },
    { label: 'YouTube', url: '' },
    { label: 'Instagram', url: '' },
    { label: 'Deezer', url: '' },
    { label: 'Apple Music', url: '' },
    { label: 'SoundCloud', url: '' },
    { label: 'Facebook', url: '' },
  ],

  /** Boutique externe : Bandcamp, BigCartel… Vide = onglet masqué. */
  shop: { label: 'Boutique', url: '' },

  /**
   * Flux public du calendrier « Concerts », pour le bouton d’abonnement des
   * fans. À ne pas confondre avec CALENDAR_ICS_URL qui est l’adresse secrète.
   */
  publicCalendarUrl: '',

  /** Sorties, de la plus récente à la plus ancienne. */
  releases: [
    {
      title: 'Titre de l’EP',                          // À REMPLACER
      year: 2022,
      kind: 'EP',
      note: 'Cinq titres enregistrés en deux semaines.',
      links: [
        { label: 'Bandcamp', url: '' },
        { label: 'Spotify', url: '' },
      ],
      tracks: ['Premier titre', 'Deuxième titre', 'Troisième titre', 'Quatrième titre', 'Cinquième titre'],
    },
  ],
} as const;

export type SiteLink = { label: string; url: string };

/** Ne garde que les liens réellement renseignés. */
export const activeLinks: SiteLink[] = site.links.filter((l) => l.url.trim().length > 0);

export const nav = [
  { label: 'Concerts', href: '/concerts' },
  { label: 'Photos', href: '/photos' },
  { label: 'Écouter', href: '/ecouter' },
  { label: 'Bio', href: '/bio' },
  { label: 'Contact', href: '/contact' },
];
