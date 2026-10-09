/**
 * Tout le contenu éditorial du site vit ici.
 *
 * Les valeurs actuelles sont du contenu bouchon : remplace-les et le site se
 * met à jour partout. Un lien laissé vide est simplement masqué, rien ne casse.
 */

export const site = {
  name: 'Tales of Memory',
  /** Sous-titre affiché sous le nom, et genre utilisé pour le référencement. */
  // Écrit en casse normale : le bandeau le passe en majuscules par le style,
  // alors que le titre de page et les données structurées le reprennent tel quel.
  tagline: 'Métal symphonique',
  city: 'Région parisienne',                           // à préciser si tu veux une ville
  foundedYear: 2019,                                   // À REMPLACER
  domain: 'https://www.talesofmemory.com',
  /** Phrase unique reprise dans les métadonnées et les partages sur réseaux. */
  summary:
    'Tales of Memory est un groupe de métal symphonique. Récits intimes, ' +
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

  /**
   * Réseaux et plateformes. Un lien vide est simplement masqué, l'ordre ici est
   * celui de l'affichage. `icon` doit correspondre à une clé de ICONS dans
   * src/components/SocialLinks.astro.
   */
  links: [
    { label: 'Instagram', icon: 'instagram', url: 'https://www.instagram.com/tales_of_memory/' },
    { label: 'YouTube', icon: 'youtube', url: 'https://www.youtube.com/@talesofmemory-4marj' },
    { label: 'Facebook', icon: 'facebook', url: 'https://www.facebook.com/talesofmemory/' },
    { label: 'Spotify', icon: 'spotify', url: '' },
    { label: 'Deezer', icon: 'deezer', url: '' },
    { label: 'Apple Music', icon: 'applemusic', url: '' },
    { label: 'Bandcamp', icon: 'bandcamp', url: '' },
    { label: 'SoundCloud', icon: 'soundcloud', url: '' },
    { label: 'TikTok', icon: 'tiktok', url: '' },
  ],

  /** Boutique externe : Bandcamp, BigCartel… Vide = onglet masqué. */
  shop: { label: 'Boutique', url: '' },

  /**
   * Flux public du calendrier « Concerts », pour le bouton d’abonnement des
   * fans. À ne pas confondre avec CALENDAR_ICS_URL qui est l’adresse secrète.
   */
  publicCalendarUrl: '/concerts.ics',

  /** Sorties, de la plus récente à la plus ancienne. */
  releases: [
    {
      title: 'Forgotten Chapters',
      year: 2026,
      kind: 'Album',
      note: '',
      links: [
        { label: 'Bandcamp', url: '' },
        { label: 'Spotify', url: '' },
      ],
      // Repris du verso de la jaquette. Sert de secours : quand des fichiers
      // audio sont déposés, la liste affichée vient de leurs noms de fichiers.
      // `intro: true` sort le morceau de la numérotation, comme le préfixe 00
      // d'un nom de fichier audio.
      tracks: [
        { title: 'Arx Memoriae', intro: true },
        { title: 'Arrow of Justice', intro: false },
        { title: 'Legend of the Seven Seas', intro: false },
        { title: 'My Demons', intro: false },
        { title: 'One Thousand and One Nights', intro: false },
        { title: 'Candlelight', intro: false },
        { title: 'Letter', intro: false },
        { title: 'Burgundy’s Fight', intro: false },
        { title: 'Orléans', intro: false },
        { title: 'Last Hope', intro: false },
      ],
    },
  ],
} as const;

export type SiteLink = { label: string; url: string; icon: string };

/** Ne garde que les liens réellement renseignés. */
export const activeLinks: SiteLink[] = site.links.filter((l) => l.url.trim().length > 0);

export const nav = [
  { label: 'Concerts', href: '/concerts' },
  { label: 'Écouter', href: '/ecouter' },
  { label: 'Bio', href: '/bio' },
  { label: 'Contact', href: '/contact' },
];
