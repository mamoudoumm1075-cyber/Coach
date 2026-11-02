/**
 * ─────────────────────────────────────────────────────────────
 *  CONFIGURATION CENTRALE DU SITE
 *  Tout ce qui est propre à la marque se modifie ici, puis :
 *      node build.mjs
 *  regénère index.html, contact.html, mentions.html et le sitemap.
 * ─────────────────────────────────────────────────────────────
 *
 *  Les textes sont des placeholders rédigés pour donner le ton.
 *  Les éléments entre crochets [ … ] sont des données à fournir.
 */

export default {
  /* ── Identité ─────────────────────────────────────────── */
  brand: {
    name: 'Orée',
    // Logo : SVG inline (monogramme). Remplacer par votre propre SVG,
    // ou indiquer un fichier dans `logoSrc` (ex. 'assets/img/logo.svg').
    logoSrc: '',
    tagline: 'Le monde, à voix basse.',
    description:
      "Orée — une expérience pensée dans ses moindres détails, pour celles et ceux qui préfèrent l'essentiel au bruit.",
    url: 'https://example.com', // adresse définitive du site (SEO, partage)
    locale: 'fr_FR',
    lang: 'fr',
    year: new Date().getFullYear(),
  },

  /* ── Palette (variables CSS générées automatiquement) ─── */
  colors: {
    nuit: '#0A0F16', // fond principal, bleu de l'heure bleue
    ardoise: '#151C26', // surfaces et filets
    lin: '#ECE6DA', // texte principal
    brume: '#9AA4B0', // texte secondaire
    laiton: '#C2A06B', // accent, utilisé avec parcimonie
  },

  /* ── Navigation ──────────────────────────────────────── */
  nav: [
    { label: 'Manifeste', href: 'index.html#manifeste' },
    { label: 'Univers', href: 'index.html#univers' },
    { label: 'Déroulé', href: 'index.html#deroule' },
    { label: 'Galerie', href: 'index.html#galerie' },
  ],
  primaryCta: { label: 'Prendre contact', href: 'contact.html' },

  /* ── Sections de la page d'accueil, dans l'ordre ─────── *
   *  Retirer un nom de cette liste masque la section.       */
  sections: ['hero', 'manifeste', 'univers', 'seuil', 'qualites', 'deroule', 'galerie', 'appel', 'finale'],

  /* ── Images ──────────────────────────────────────────── *
   *  Deux formes possibles pour chaque image :
   *   1. Visuel génératif (actuel) : { scene, render:[l,h], widths:[…], alt }
   *      → produit par `node outils/rendre-images.mjs`
   *   2. Vraie photo : { src: 'assets/img/photo.jpg', width, height, alt }
   *      (ou srcset : { srcset: [['assets/img/p-800.webp',800], …], width, height, alt })
   *  `focus` règle le recadrage (object-position), ex. '50% 30%'.         */
  images: {
    lac: { scene: 'lac', render: [2400, 1350], widths: [960, 1600, 2400], alt: "Lac de montagne à l'heure bleue, crêtes reflétées dans l'eau immobile" },
    lacPortrait: { scene: 'lac', render: [1600, 2000], widths: [700, 1400], t: 20, alt: 'Lac nocturne cadré à la verticale, sommets et reflets' },
    brume: { scene: 'brume', render: [1600, 2000], widths: [700, 1400], alt: 'Brume posée sur une lisière de conifères au petit matin' },
    brumeLarge: { scene: 'brume', render: [2400, 1350], widths: [1200, 2400], t: 30, alt: 'Plans de montagnes successifs noyés dans la brume' },
    pierre: { scene: 'pierre', render: [1600, 2000], widths: [700, 1400], alt: 'Relief minéral éclairé en lumière rasante' },
    onde: { scene: 'onde', render: [1600, 2000], widths: [700, 1400], alt: "Surface d'eau sombre traversée de reflets dorés" },
    ondeLarge: { scene: 'onde', render: [2400, 1350], widths: [1200, 2400], t: 40, alt: "Reflets dorés à la surface de l'eau, de nuit" },
    astres: { scene: 'astres', render: [2400, 1350], widths: [1200, 2400], alt: 'Ciel étoilé au-dessus de crêtes bleutées' },
    seuil: { scene: 'seuil', render: [2400, 1350], widths: [1200, 2400], alt: "Ouverture lumineuse au fond d'une pièce plongée dans l'ombre" },
    rivage: { scene: 'rivage', render: [1600, 2000], widths: [700, 1400], alt: 'Lune au-dessus de la mer et son chemin de lumière' },
    damson: { srcset: [['assets/img/damson-800.webp', 800], ['assets/img/damson-1500.webp', 1500]], width: 1500, height: 2000, alt: 'Damson, de nuit, casquette noire et débardeur blanc, se retourne vers l’objectif' },
    braise: { scene: 'braise', render: [1600, 1600], widths: [700, 1400], alt: 'Dernières braises du couchant derrière une chaîne de montagnes' },
  },

  /* ── Hero ────────────────────────────────────────────── */
  hero: {
    // Visuel en direct (WebGL). Mettre `live: false` pour n'afficher que l'image fixe,
    // ou renseigner `video: 'assets/video/hero.mp4'` pour une vidéo plein écran.
    live: true,
    scene: 'lac',
    image: 'lac',
    video: '',
    title: ['Le monde,', 'à voix basse.'],
    text: "Une expérience pensée dans ses moindres détails, pour celles et ceux qui préfèrent l'essentiel au bruit.",
    cta: { label: 'Prendre contact', href: 'contact.html' },
    secondary: { label: "Découvrir l'univers", href: '#manifeste' },
  },

  /* ── Manifeste ───────────────────────────────────────── */
  manifeste: {
    id: 'manifeste',
    title: 'Manifeste',
    text:
      "L'exception ne se proclame pas. Elle se reconnaît à la justesse d'un geste, à la qualité d'un silence, au soin porté à ce que personne ne remarque. Chaque détail est pensé pour durer, puis pour s'effacer derrière ce qu'il rend possible.",
    image: 'brume',
    caption: 'Lisière, au petit matin',
  },

  /* ── Univers (liste éditoriale, image au survol) ─────── */
  univers: {
    id: 'univers',
    title: "Quatre manières d'entrer",
    intro: "Chaque univers peut devenir une offre, une collection ou un lieu. Les noms et les textes sont à adapter.",
    items: [
      { title: 'Le paysage', text: 'Un cadre choisi pour sa lumière, ses distances et son calme.', image: 'brume' },
      { title: 'La matière', text: 'Des matériaux qui gagnent à être touchés, et qui vieillissent bien.', image: 'pierre' },
      { title: "L'eau", text: 'Une présence lente, qui règle le rythme de tout le reste.', image: 'onde' },
      { title: 'La nuit', text: "L'heure où les choses importantes se disent plus bas.", image: 'astres' },
    ],
  },

  /* ── Seuil (séquence plein écran au défilement) ──────── */
  seuil: {
    id: 'seuil',
    title: 'Franchir le seuil.',
    text: "Il existe un moment où l'on quitte l'ordinaire. Tout notre travail consiste à le rendre évident.",
    image: 'seuil',
  },

  /* ── Qualités (image fixe qui change au fil du texte) ─── */
  qualites: {
    id: 'qualites',
    title: "Ce qui ne se voit pas, d'abord",
    items: [
      { title: 'Discrétion', text: "Rien n'est exposé sans raison. Ce qui vous concerne reste entre nous.", image: 'rivage' },
      { title: 'Précision', text: 'Une seule personne suit votre demande, du premier échange au dernier détail.', image: 'braise' },
      { title: 'Écoute', text: 'Écouter avant de proposer. Proposer peu, mais juste.', image: 'lacPortrait' },
    ],
  },

  /* ── Déroulé (étapes réellement successives) ─────────── */
  deroule: {
    id: 'deroule',
    title: 'Le déroulé',
    steps: [
      { title: 'Premier échange', text: 'Vous nous dites ce que vous imaginez, même sans savoir encore comment le formuler.' },
      { title: 'Proposition', text: 'Nous revenons vers vous avec une proposition claire, construite pour vous.' },
      { title: 'Préparation', text: 'Chaque détail est réglé en amont, pour que rien ne vous distraie.' },
      { title: 'Le moment', text: 'Il ne vous reste qu’à le vivre.' },
    ],
  },

  /* ── Galerie ─────────────────────────────────────────── *
   *  shape : tall (4:5), wide (16:9), square (1:1)          */
  galerie: {
    id: 'galerie',
    title: 'Carnet de lumière',
    intro: 'Une sélection de visuels. Cliquez sur une image pour l’agrandir.',
    items: [
      { image: 'rivage', shape: 'tall', caption: 'Rivage, nuit de pleine lune' },
      { image: 'ondeLarge', shape: 'wide', caption: "Reflets sur l'eau" },
      { image: 'braise', shape: 'square', caption: 'Couchant, versant ouest' },
      { image: 'brumeLarge', shape: 'wide', caption: 'Plans successifs' },
      { image: 'pierre', shape: 'tall', caption: 'Matière, lumière rasante' },
      { image: 'lacPortrait', shape: 'tall', caption: 'Lac, heure bleue' },
    ],
  },

  /* ── Appel final ─────────────────────────────────────── */
  appel: {
    id: 'appel',
    title: 'Commençons par une conversation.',
    text: 'Dites-nous ce que vous avez en tête. Nous vous répondons personnellement.',
    cta: { label: 'Écrire un message', href: 'contact.html' },
    image: 'astres',
  },

  /* ── La démonstration pour Damson ───────────────────── *
   *  Apartés glissés entre les sections (`after` = section qui précède)
   *  et séquence finale avec sa photo. `enabled: false` retire tout.
   *  Styles d'apparition : trace, mots, flou, marge, machine.             */
  damson: {
    enabled: true,
    apartes: [
      { after: 'hero', style: 'trace', text: 'Tu vois, Damson ? Je t’avais dit que c’était possible.' },
      { after: 'manifeste', style: 'marge', text: 'Et pourtant, on ne fait que commencer.' },
      { after: 'univers', style: 'mots', text: 'Tu commences à comprendre, Damson ? Alors franchis le seuil.' },
      { after: 'seuil', style: 'flou', text: 'Toujours convaincu que c’est impossible ?' },
      { after: 'galerie', style: 'machine', text: 'J’espère que tu regardes bien. On arrive à la démonstration finale.' },
    ],
    finale: {
      id: 'finale',
      intro: 'Bon Damson… il faut qu’on parle.',
      image: 'damson',
      focus: '39% 33%', // centre du visage, pour le zoom
      cartel: ['Portrait d’un sceptique', 'Tirage unique, collection privée'],
      question: 'Alors, toujours impossible ? 😂',
      signature: 'Démonstration terminée. Damson, on attend ton avis.',
    },
  },

  /* ── Page contact ────────────────────────────────────── */
  contact: {
    title: 'Écrivez-nous.',
    intro: 'Quelques lignes suffisent. Nous revenons vers vous personnellement.',
    image: 'seuil',
    // Adresse de réception. Sans `endpoint`, le formulaire ouvre la messagerie
    // du visiteur avec le message prérempli (mailto).
    email: 'contact@example.com',
    // Service d'envoi (Formspree, Basin, votre API…) : URL qui accepte un POST JSON.
    endpoint: '',
    subjects: ['Une première demande', 'Une collaboration', 'La presse', 'Autre chose'],
  },

  /* ── Coordonnées (placeholders) ──────────────────────── */
  coordinates: {
    address: ['[Adresse — à définir]', '[Code postal, Ville]'],
    phone: '[Téléphone — à définir]',
    email: 'contact@example.com',
    hours: '[Horaires — à définir]',
  },

  /* ── Réseaux sociaux : sans `href`, le nom s'affiche comme placeholder ─ */
  socials: [
    { label: 'Instagram', href: '' },
    { label: 'LinkedIn', href: '' },
    { label: 'Pinterest', href: '' },
  ],

  /* ── Pied de page ────────────────────────────────────── */
  footer: {
    note: 'Une identité temporaire, prête à recevoir la vôtre.',
    legal: { label: 'Mentions légales', href: 'mentions.html' },
  },
};
