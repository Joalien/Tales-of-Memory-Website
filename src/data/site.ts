/**
 * Tout le contenu éditorial du site vit ici.
 *
 * Les valeurs actuelles sont du contenu bouchon : remplace-les et le site se
 * met à jour partout. Un lien laissé vide est simplement masqué, rien ne casse.
 */

/**
 * Texte d'attente des présentations individuelles : le même pour tous, pour
 * qu'on voie d'un coup d'œil ce qui reste à écrire.
 */
const PLACEHOLDER_MEMBER =
  'Deux ou trois phrases à écrire : le parcours, les influences, ce que cette ' +
  'place apporte au groupe. À REMPLACER.';

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

  /**
   * Le line-up, dans l'ordre de la bande de portraits de la page bio.
   *
   * Noms et instruments repris du livret du CD « Forgotten Chapters », page
   * « The Band » : c'est la source que le groupe a lui-même publiée, à préférer
   * à ce qui traîne ailleurs. L'ordre, lui, est celui de la rangée de portraits
   * et non celui du livret : le chant est placé au centre des cinq.
   *
   * `photo` est le nom du fichier déposé dans `photos/membres/`, sans son
   * extension : `photos/membres/josquin.png` s'écrit `photo: 'josquin'`.
   * C'est le nom du fichier qui fait le rattachement, pas l'ordre de la liste.
   * Si le fichier manque, la bande affiche un cadre d'attente à sa place et la
   * mise en page ne bouge pas : les valeurs ci-dessous nomment donc aussi les
   * portraits qui restent à fournir.
   */
  members: [
    { name: 'Josquin Cornec', role: 'Basse', photo: 'josquin', text: PLACEHOLDER_MEMBER },
    { name: 'Alexis Delapierre', role: 'Guitares', photo: 'alexis', text: PLACEHOLDER_MEMBER },
    { name: 'Marianna Nikiforova Gonzalez', role: 'Chant', photo: 'marianna', text: PLACEHOLDER_MEMBER },
    { name: 'Julien Pires', role: 'Batterie', photo: 'julien', text: PLACEHOLDER_MEMBER },
    { name: 'Amine Benabdelmoumen', role: 'Claviers & synthés', photo: 'amine', text: PLACEHOLDER_MEMBER },
  ],

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
    { label: 'Spotify', icon: 'spotify', url: 'https://open.spotify.com/artist/4MgmYQ7lDvNW65n7BbkuPT' },
    { label: 'Deezer', icon: 'deezer', url: 'https://www.deezer.com/artist/365867122' },
    { label: 'Apple Music', icon: 'applemusic', url: 'https://music.apple.com/fr/artist/tales-of-memory/1866689751' },
    { label: 'Bandcamp', icon: 'bandcamp', url: '' },
    { label: 'SoundCloud', icon: 'soundcloud', url: '' },
    { label: 'TikTok', icon: 'tiktok', url: 'https://www.tiktok.com/@tales_of_memory' },
  ],

  /**
   * La boutique qui encaisse réellement.
   *
   * Le site est statique : il ne peut pas prendre un paiement. C'est donc une
   * plateforme tierce qui tient la caisse, le port et la TVA, et la page
   * /merch n'en est que la vitrine.
   *
   * `label` nomme l'onglet dans le bandeau comme dans le pied de page : il n'y
   * a qu'ici à le changer pour écrire « Boutique » ou « Merchandising ».
   *
   * `url` vide ne casse rien : la page reste en ligne et annonce la vente aux
   * concerts. Le jour où la boutique ouvre, cette seule ligne fait apparaître
   * les boutons de commande sur tous les articles qui n'ont pas de lien propre.
   */
  shop: {
    label: 'Merch',
    url: '',
    /** Nom de la plateforme, dit sur le bouton pour qu'on sache où l'on va. */
    platform: '',
  },

  /**
   * Les articles, dans l'ordre d'affichage.
   *
   * `photo` est le nom du fichier déposé dans `photos/merch/`, sans son
   * extension : `photos/merch/tshirt-logo.jpg` s'écrit `photo: 'tshirt-logo'`.
   * Comme pour les portraits de la page bio, c'est le nom du fichier qui fait
   * le rattachement et non l'ordre de la liste ; un visuel absent affiche un
   * cadre d'attente sans décaler les autres articles.
   *
   * `album: true` reprend la pochette déjà dérivée dans `public/album/cover/`,
   * au lieu de redemander une image pour un visuel que le site possède déjà.
   *
   * `url` est le lien d'achat propre à l'article, utile quand la plateforme
   * donne une adresse par produit. Laissé vide, l'article renvoie vers
   * `shop.url` ; si celle-ci est vide aussi, il s'affiche sans bouton et la
   * page explique comment l'acheter.
   */
  merch: [
    {
      name: 'Forgotten Chapters',
      kind: 'CD',
      price: '12 €',
      text:
        'L’album en disque, dix titres et son livret illustré. ' +
        'La version physique contient les textes complets.',   // À REMPLACER
      photo: '',
      album: true,
      sizes: [],
      url: '',
    },
    {
      name: 'T-shirt logo',
      kind: 'T-shirt',
      price: '20 €',                                           // À REMPLACER
      text: 'Coton épais, impression sur l’avant. Coupe droite.', // À REMPLACER
      photo: 'tshirt-logo',
      album: false,
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],                     // À REMPLACER
      url: '',
    },
    {
      name: 'T-shirt Forgotten Chapters',
      kind: 'T-shirt',
      price: '22 €',                                           // À REMPLACER
      text: 'La pochette de l’album à l’avant, les dates de tournée au dos.', // À REMPLACER
      photo: 'tshirt-album',
      album: false,
      sizes: ['S', 'M', 'L', 'XL'],                            // À REMPLACER
      url: '',
    },
    {
      name: 'Tote bag',
      kind: 'Accessoire',
      price: '12 €',                                           // À REMPLACER
      text: 'Toile écrue, logo sérigraphié.',                  // À REMPLACER
      photo: 'tote-bag',
      album: false,
      sizes: [],
      url: '',
    },
    {
      name: 'Poster',
      kind: 'Affiche',
      price: '8 €',                                            // À REMPLACER
      text: 'Visuel de l’album, 40 × 60 cm, papier mat.',       // À REMPLACER
      photo: 'poster',
      album: false,
      sizes: [],
      url: '',
    },
  ],

  /**
   * Calendrier « Concerts » du groupe, rendu public.
   *
   * Sert au bouton d’abonnement : un abonné reçoit les nouvelles dates
   * immédiatement, sans attendre une reconstruction du site. Vide = bouton
   * masqué.
   */
  publicCalendarId: '24756feb85859e5108698cc64191491fc19929d63ce90334a4d9487f78a9ce9b@group.calendar.google.com',

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

/**
 * Le bandeau de navigation.
 *
 * L'onglet de la boutique reprend `site.shop.label` : le mot se change à un
 * seul endroit, et il reste le même dans le bandeau et dans le pied de page.
 * Il est placé après « Écouter », là où le visiteur arrive quand la musique lui
 * a plu.
 */
export const nav = [
  { label: 'Concerts', href: '/concerts' },
  { label: 'Écouter', href: '/ecouter' },
  { label: site.shop.label, href: '/merch' },
  { label: 'Bio', href: '/bio' },
  { label: 'Contact', href: '/contact' },
];
