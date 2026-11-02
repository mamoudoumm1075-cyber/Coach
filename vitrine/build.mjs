/**
 * Générateur du site statique.
 *   node build.mjs
 * Lit site.config.mjs et écrit index.html, contact.html, mentions.html,
 * 404.html, sitemap.xml, robots.txt et assets/css/tokens.css.
 * Aucune dépendance : le HTML produit est complet (bon pour le référencement).
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import site from './site.config.mjs';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const { brand } = site;

/* ── Utilitaires ───────────────────────────────────────── */
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const attrs = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== false && v !== '').map(([k, v]) => (v === true ? k : `${k}="${esc(v)}"`)).join(' ');

/** Image responsive à partir du registre `site.images`. */
function img(id, { sizes = '100vw', cls = '', eager = false, alt, extra = {} } = {}) {
  const im = site.images[id];
  if (!im) throw new Error(`Image inconnue : ${id}`);
  let src, srcset, width, height;
  if (im.scene) {
    srcset = im.widths.map((w) => `assets/img/${id}-${w}.webp ${w}w`).join(', ');
    src = `assets/img/${id}-${im.widths[Math.min(1, im.widths.length - 1)]}.webp`;
    [width, height] = im.render;
  } else if (im.srcset) {
    srcset = im.srcset.map(([u, w]) => `${u} ${w}w`).join(', ');
    src = im.srcset[im.srcset.length - 1][0];
    ({ width, height } = im);
  } else {
    ({ src, width, height } = im);
  }
  return `<img ${attrs({
    class: cls,
    src,
    srcset,
    sizes: srcset ? sizes : undefined,
    width,
    height,
    alt: alt ?? im.alt ?? '',
    loading: eager ? 'eager' : 'lazy',
    decoding: 'async',
    fetchpriority: eager ? 'high' : undefined,
    style: im.focus ? `object-position:${im.focus}` : undefined,
    ...extra,
  })}>`;
}
const imgUrl = (id, w) => {
  const im = site.images[id];
  if (im.scene) return `assets/img/${id}-${w ?? im.widths[im.widths.length - 1]}.webp`;
  return im.src || im.srcset?.at(-1)?.[0];
};

const logo = () =>
  brand.logoSrc
    ? `<img src="${esc(brand.logoSrc)}" alt="" class="logo__img" width="32" height="32">`
    : `<svg class="logo__mark" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><circle cx="20" cy="20" r="18.5" fill="none" stroke="currentColor" stroke-width="1"/><path d="M1.5 24.5h37" stroke="currentColor" stroke-width="1"/><path d="M8 24.5a12 12 0 0 1 24 0" fill="none" stroke="currentColor" stroke-width="1"/></svg>`;

/** Bouton : le libellé est doublé pour l'effet de défilement au survol. */
const button = ({ label, href }, variant = 'plein') =>
  `<a class="bouton bouton--${variant}" href="${esc(href)}"><span class="bouton__libelle" data-texte="${esc(label)}"><span>${esc(label)}</span></span></a>`;
const lien = ({ label, href }) => `<a class="lien" href="${esc(href)}">${esc(label)}</a>`;

/* ── Gabarit commun ────────────────────────────────────── */
function header(current) {
  const items = site.nav
    .map((n) => `<li><a class="nav__lien" href="${esc(n.href)}">${esc(n.label)}</a></li>`)
    .join('');
  const menuItems = [...site.nav, site.primaryCta]
    .map((n, i) => `<li style="--i:${i}"><a href="${esc(n.href)}">${esc(n.label)}</a></li>`)
    .join('');
  return `
<a class="evitement" href="#contenu">Aller au contenu</a>
<header class="entete" data-entete>
  <div class="entete__barre">
    <a class="logo" href="index.html" aria-label="${esc(brand.name)}, accueil">${logo()}<span class="logo__nom">${esc(brand.name)}</span></a>
    <nav class="nav" aria-label="Navigation principale"><ul>${items}</ul></nav>
    <div class="entete__actions">
      <a class="entete__cta lien" href="${esc(site.primaryCta.href)}"${current === 'contact' ? ' aria-current="page"' : ''}>${esc(site.primaryCta.label)}</a>
      <button class="menu-bouton" type="button" aria-expanded="false" aria-controls="menu" data-menu-bouton>
        <span class="menu-bouton__texte" data-ouvert="Fermer" data-ferme="Menu">Menu</span>
        <span class="menu-bouton__traits" aria-hidden="true"><i></i><i></i></span>
      </button>
    </div>
  </div>
</header>
<div class="menu" id="menu" data-menu hidden>
  <div class="menu__horizon" aria-hidden="true"></div>
  <nav aria-label="Menu"><ol class="menu__liste">${menuItems}</ol></nav>
  <div class="menu__pied">
    <p>${esc(site.coordinates.email)}</p>
    <p>${esc(site.coordinates.phone)}</p>
  </div>
</div>`;
}

function footer() {
  const socials = site.socials
    .map((s) => (s.href ? `<li><a class="lien" href="${esc(s.href)}" rel="noopener" target="_blank">${esc(s.label)}</a></li>` : `<li><span class="a-venir" title="Lien à configurer dans site.config.mjs">${esc(s.label)} <small>(lien à venir)</small></span></li>`))
    .join('');
  const c = site.coordinates;
  return `
<footer class="pied">
  <div class="pied__grille">
    <div class="pied__marque">
      <a class="logo" href="index.html" aria-label="${esc(brand.name)}, accueil">${logo()}<span class="logo__nom">${esc(brand.name)}</span></a>
      <p>${esc(site.footer.note)}</p>
    </div>
    <nav class="pied__col pied__col--nav" aria-label="Plan du site">
      <h2 class="pied__titre">Parcourir</h2>
      <ul>${site.nav.map((n) => `<li>${lien(n)}</li>`).join('')}<li>${lien(site.primaryCta)}</li></ul>
    </nav>
    <div class="pied__col pied__col--coord">
      <h2 class="pied__titre">Coordonnées</h2>
      <address>
        ${c.address.map(esc).join('<br>')}<br>
        ${esc(c.phone)}<br>
        <a class="lien" href="mailto:${esc(c.email)}">${esc(c.email)}</a><br>
        ${esc(c.hours)}
      </address>
      <p class="pied__mention">Coordonnées fictives, à remplacer.</p>
    </div>
    <div class="pied__col pied__col--reseaux">
      <h2 class="pied__titre">Suivre</h2>
      <ul>${socials}</ul>
    </div>
  </div>
  <div class="pied__bas">
    <p>© ${brand.year} ${esc(brand.name)}</p>
    <a class="lien" href="${esc(site.footer.legal.href)}">${esc(site.footer.legal.label)}</a>
    <a class="lien pied__haut" href="#haut" data-haut>Revenir en haut</a>
  </div>
  <p class="pied__signature" aria-hidden="true">${esc(brand.name)}</p>
</footer>
<div class="rideau" aria-hidden="true"><span class="rideau__ligne"></span></div>`;
}

function page({ file, title, description, body, current, ogImage = 'lac', preload = '' }) {
  const url = `${brand.url.replace(/\/$/, '')}/${file === 'index.html' ? '' : file}`;
  const fullTitle = title ? `${title} | ${brand.name}` : `${brand.name} | ${brand.tagline}`;
  const og = `${brand.url.replace(/\/$/, '')}/${imgUrl(ogImage, site.images[ogImage].widths?.[1])}`;
  const ld = { '@context': 'https://schema.org', '@type': 'Organization', name: brand.name, url: brand.url, description: brand.description };
  return `<!doctype html>
<html lang="${brand.lang}" class="sans-js"${current === 'accueil' && site.navigation?.mode === 'scenes' ? ' data-scenes' : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description || brand.description)}">
<link rel="canonical" href="${esc(url)}">
<meta name="theme-color" content="${site.colors.nuit}">
<meta name="color-scheme" content="dark">
<meta property="og:type" content="website">
<meta property="og:locale" content="${brand.locale}">
<meta property="og:site_name" content="${esc(brand.name)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description || brand.description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(og)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="preload" href="assets/fonts/bodoni-moda.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/hanken-grotesk.woff2" as="font" type="font/woff2" crossorigin>
${preload}<link rel="stylesheet" href="assets/css/tokens.css">
<link rel="stylesheet" href="assets/css/main.css">
<script>var R=document.documentElement;R.className='js'+(matchMedia('(prefers-reduced-motion: reduce)').matches?' calme':'')+(R.hasAttribute('data-scenes')?' mode-scenes':'');setTimeout(function(){document.body&&document.body.classList.add('est-charge')},3500);</script>
<script defer src="assets/js/horizon.js"></script>
<script defer src="assets/js/main.js"></script>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body data-page="${current}" id="haut">${current === 'accueil' && site.navigation?.mode === 'scenes' ? `\n<script type="application/json" id="config-scenes">${JSON.stringify({ transitions: site.navigation.transitions || {}, noms: site.navigation.noms || {} })}</script>` : ''}
${header(current)}
<main id="contenu">
${body}
</main>
${footer()}
</body>
</html>
`;
}

/* ── Sections de l'accueil ─────────────────────────────── */
const S = {
  hero() {
    const h = site.hero;
    const media = h.video
      ? `<video class="hero__video" autoplay muted loop playsinline poster="${esc(imgUrl(h.image))}"><source src="${esc(h.video)}"></video>`
      : `${img(h.image, { cls: 'hero__image', eager: true, alt: '' })}${h.live ? `<canvas class="hero__canvas" data-horizon="${esc(h.scene)}" aria-hidden="true"></canvas>` : ''}`;
    return `
<section class="hero" data-hero aria-labelledby="hero-titre">
  <div class="hero__media" data-hero-media>${media}<div class="hero__voile"></div></div>
  <div class="hero__ligne" aria-hidden="true"></div>
  <div class="hero__contenu">
    <h1 class="hero__titre" id="hero-titre">${h.title.map((l, i) => `<span class="hero__l" style="--i:${i}"><span>${esc(l)}</span></span>`).join(' ')}</h1>
    <div class="hero__aside">
      <p class="hero__texte">${esc(h.text)}</p>
      <div class="hero__actions">${button(h.cta)}${lien(h.secondary)}</div>
    </div>
  </div>
  <a class="hero__defiler" href="${esc(h.secondary.href)}" aria-label="Faire défiler vers la suite"><span></span></a>
</section>`;
  },

  manifeste() {
    const m = site.manifeste;
    const words = m.text.split(/\s+/).map((w) => `<span class="mot">${esc(w)}</span>`).join(' ');
    return `
<section class="manifeste" id="${m.id}" aria-labelledby="manifeste-titre">
  <figure class="manifeste__figure cadre" data-parallaxe>
    ${img(m.image, { sizes: '(min-width: 900px) 24vw, 70vw' })}
    <figcaption>${esc(m.caption)}</figcaption>
  </figure>
  <div class="manifeste__corps">
    <h2 class="titre-section" id="manifeste-titre">${esc(m.title)}</h2>
    <p class="manifeste__texte" data-mots>${words}</p>
  </div>
</section>`;
  },

  univers() {
    const u = site.univers;
    const rows = u.items
      .map(
        (it) => `
    <li class="univers__item" data-univers-item data-image="${esc(imgUrl(it.image, site.images[it.image].widths?.[0]))}">
      <h3 class="univers__nom">${esc(it.title)}</h3>
      <p class="univers__texte">${esc(it.text)}</p>
      <div class="univers__vignette cadre">${img(it.image, { sizes: '40vw', alt: '' })}</div>
    </li>`,
      )
      .join('');
    return `
<section class="univers" id="${u.id}" aria-labelledby="univers-titre">
  <header class="univers__tete">
    <h2 class="titre-grand" id="univers-titre">${esc(u.title)}</h2>
    <p class="chapo">${esc(u.intro)}</p>
  </header>
  <ul class="univers__liste" data-univers>${rows}
  </ul>
  <div class="univers__flottant" aria-hidden="true" data-flottant><img alt="" src="" decoding="async"></div>
</section>`;
  },

  seuil() {
    const s = site.seuil;
    return `
<section class="seuil" id="${s.id}" data-seuil aria-labelledby="seuil-titre">
  <div class="seuil__scene">
    <div class="seuil__ouverture" data-seuil-ouverture>${img(s.image, { sizes: '100vw', cls: 'seuil__image' })}</div>
    <div class="seuil__texte">
      <h2 class="titre-monumental" id="seuil-titre">${esc(s.title)}</h2>
      <p class="chapo">${esc(s.text)}</p>
    </div>
  </div>
</section>`;
  },

  qualites() {
    const q = site.qualites;
    const media = q.items.map((it, i) => `<div class="qualites__plan${i === 0 ? ' est-actif' : ''}" data-plan="${i}">${img(it.image, { sizes: '(min-width: 900px) 40vw, 90vw' })}</div>`).join('');
    const items = q.items
      .map(
        (it, i) => `
      <li class="qualites__item${i === 0 ? ' est-actif' : ''}" data-qualite="${i}">
        <div class="qualites__mobile cadre">${img(it.image, { sizes: '90vw', alt: '' })}</div>
        <h3 class="qualites__nom">${esc(it.title)}</h3>
        <p>${esc(it.text)}</p>
      </li>`,
      )
      .join('');
    return `
<section class="qualites" id="${q.id}" aria-labelledby="qualites-titre">
  <div class="qualites__media" aria-hidden="true"><div class="qualites__cadre cadre">${media}</div></div>
  <div class="qualites__corps">
    <h2 class="titre-grand" id="qualites-titre">${esc(q.title)}</h2>
    <ol class="qualites__liste" data-qualites>${items}
    </ol>
  </div>
</section>`;
  },

  deroule() {
    const d = site.deroule;
    return `
<section class="deroule" id="${d.id}" aria-labelledby="deroule-titre" data-deroule>
  <h2 class="titre-grand" id="deroule-titre">${esc(d.title)}</h2>
  <div class="deroule__fil" aria-hidden="true"><span data-deroule-fil></span></div>
  <ol class="deroule__etapes">
    ${d.steps.map((s, i) => `<li class="deroule__etape"><span class="deroule__num" aria-hidden="true">${i + 1}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join('\n    ')}
  </ol>
</section>`;
  },

  galerie() {
    const g = site.galerie;
    const items = g.items
      .map(
        (it, i) => `
    <li class="galerie__item galerie__item--${it.shape}">
      <button class="galerie__bouton" type="button" data-galerie-index="${i}" data-full="${esc(imgUrl(it.image))}" aria-label="Agrandir : ${esc(it.caption)}">
        <span class="cadre">${img(it.image, { sizes: it.shape === 'wide' ? '(min-width: 900px) 58vw, 92vw' : '(min-width: 900px) 34vw, 92vw' })}</span>
      </button>
      <p class="galerie__legende">${esc(it.caption)}</p>
    </li>`,
      )
      .join('');
    return `
<section class="galerie" id="${g.id}" aria-labelledby="galerie-titre">
  <header class="galerie__tete">
    <h2 class="titre-grand" id="galerie-titre">${esc(g.title)}</h2>
    <p class="chapo">${esc(g.intro)}</p>
  </header>
  <ul class="galerie__grille" data-galerie>${items}
  </ul>
  <dialog class="visionneuse" data-visionneuse aria-label="Visionneuse d'images">
    <figure><img alt="" data-visionneuse-img><figcaption data-visionneuse-legende></figcaption></figure>
    <div class="visionneuse__commandes">
      <button type="button" class="lien" data-visionneuse-prec>Précédente</button>
      <span data-visionneuse-compte aria-live="polite"></span>
      <button type="button" class="lien" data-visionneuse-suiv>Suivante</button>
      <button type="button" class="lien visionneuse__fermer" data-visionneuse-fermer>Fermer</button>
    </div>
  </dialog>
</section>`;
  },

  appel() {
    const a = site.appel;
    return `
<section class="appel" id="${a.id}" aria-labelledby="appel-titre">
  <div class="appel__fond" data-parallaxe>${img(a.image, { sizes: '100vw', alt: '' })}</div>
  <div class="appel__contenu">
    <h2 class="titre-monumental" id="appel-titre">${esc(a.title)}</h2>
    <p class="chapo">${esc(a.text)}</p>
    ${button(a.cta)}
  </div>
</section>`;
  },
};

/* ── Démonstration pour Damson : apartés et finale ─────── */
const D = site.damson?.enabled ? site.damson : null;

/** Découpe un texte en mots (et en lettres pour le style machine), sans coupure au milieu d'un mot. */
function decoupe(texte, lettres = false) {
  let n = 0;
  return texte
    .split(' ')
    .map((mot, i) => {
      const inner = lettres ? [...mot].map((ch) => `<span class="l" style="--n:${n++}">${esc(ch)}</span>`).join('') : esc(mot);
      if (lettres) n++;
      return `<span class="m" style="--i:${i}">${inner}</span>`;
    })
    .join(' ');
}

function aparte(apres) {
  const a = D?.apartes.find((x) => x.after === apres);
  if (!a) return '';
  const style = a.style || 'trace';
  return `
<aside class="aparte aparte--${style}" data-aparte aria-label="${esc(a.text)}">
  <p class="aparte__texte" aria-hidden="true">${decoupe(a.text, style === 'machine')}${style === 'machine' ? '<span class="aparte__curseur"></span>' : ''}</p>
</aside>`;
}

S.finale = () => {
  if (!D) return '';
  const f = D.finale;
  return `
<section class="finale" id="${f.id}" data-finale aria-labelledby="finale-titre">
  <div class="finale__scene">
    <h2 class="finale__intro" id="finale-titre"><span class="sr">${esc(f.intro)}</span><span aria-hidden="true">${decoupe(f.intro, true)}</span></h2>
    <figure class="finale__portrait">
      <div class="finale__cadre">
        <div class="finale__zoom" style="transform-origin:${esc(f.focus)}">${img(f.image, { sizes: '(min-width: 900px) 60vw, 150vw', cls: 'finale__photo' })}</div>
        <span class="finale__flash" aria-hidden="true"></span>
      </div>
      <figcaption class="finale__cartel"><strong>${esc(f.cartel[0])}</strong><span>${esc(f.cartel[1])}</span></figcaption>
    </figure>
    <p class="finale__question">${esc(f.question)}</p>
    <p class="finale__signature">${logo()}<span>${esc(f.signature)}</span></p>
  </div>
</section>`;
};

/* ── Pages ─────────────────────────────────────────────── */
const heroImg = site.images[site.hero.image];
const heroPreload = heroImg.scene
  ? `<link rel="preload" as="image" imagesrcset="${heroImg.widths.map((w) => `assets/img/${site.hero.image}-${w}.webp ${w}w`).join(', ')}" imagesizes="100vw">\n`
  : '';

const index = page({
  file: 'index.html',
  current: 'accueil',
  body: site.sections.map((s) => S[s]() + aparte(s)).join('\n'),
  preload: heroPreload,
});

const c = site.contact;
const contact = page({
  file: 'contact.html',
  title: 'Contact',
  description: `${c.intro} ${brand.name}.`,
  current: 'contact',
  ogImage: c.image,
  body: `
<section class="contact">
  <div class="contact__visuel" aria-hidden="true">${img(c.image, { sizes: '(min-width: 900px) 45vw, 100vw', eager: true, alt: '' })}</div>
  <div class="contact__corps">
    <h1 class="titre-monumental contact__titre">${esc(c.title)}</h1>
    <p class="chapo">${esc(c.intro)}</p>
    <form class="formulaire" data-formulaire data-endpoint="${esc(c.endpoint)}" data-email="${esc(c.email)}" novalidate>
      <div class="champ">
        <input id="f-nom" name="nom" type="text" autocomplete="name" required placeholder=" ">
        <label for="f-nom">Votre nom</label>
        <p class="champ__erreur" id="f-nom-err" aria-live="polite"></p>
      </div>
      <div class="champ">
        <input id="f-email" name="email" type="email" autocomplete="email" required placeholder=" ">
        <label for="f-email">Votre adresse e-mail</label>
        <p class="champ__erreur" id="f-email-err" aria-live="polite"></p>
      </div>
      <fieldset class="champ champ--choix">
        <legend>Votre demande concerne</legend>
        <div class="choix">${c.subjects.map((s, i) => `<label><input type="radio" name="objet" value="${esc(s)}"${i === 0 ? ' checked' : ''}><span>${esc(s)}</span></label>`).join('')}</div>
      </fieldset>
      <div class="champ">
        <textarea id="f-message" name="message" rows="5" required placeholder=" "></textarea>
        <label for="f-message">Votre message</label>
        <p class="champ__erreur" id="f-message-err" aria-live="polite"></p>
      </div>
      <div class="formulaire__pied">
        <button class="bouton bouton--plein" type="submit"><span class="bouton__libelle" data-texte="Envoyer le message"><span>Envoyer le message</span></span></button>
        <p class="formulaire__statut" data-statut role="status" aria-live="polite"></p>
      </div>
      <p class="formulaire__note">Vos informations servent uniquement à vous répondre.</p>
    </form>
  </div>
</section>`,
});

const legal = page({
  file: 'mentions.html',
  title: 'Mentions légales',
  description: `Mentions légales de ${brand.name}.`,
  current: 'mentions',
  body: `
<section class="texte-page">
  <h1 class="titre-monumental">Mentions légales</h1>
  <p class="chapo">Page à compléter avant la mise en ligne. Chaque information entre crochets doit être remplacée.</p>
  <h2>Éditeur du site</h2>
  <p>[Raison sociale]<br>[Forme juridique, capital]<br>[Adresse du siège]<br>[Numéro d'immatriculation]<br>[Directeur ou directrice de la publication]</p>
  <h2>Hébergement</h2>
  <p>[Nom de l'hébergeur]<br>[Adresse de l'hébergeur]</p>
  <h2>Données personnelles</h2>
  <p>Les informations envoyées par le formulaire de contact servent uniquement à répondre à votre demande. [Durée de conservation, contact pour exercer vos droits.]</p>
  <h2>Crédits</h2>
  <p>Typographies Bodoni Moda et Hanken Grotesk, sous licence SIL Open Font License. Visuels génératifs produits pour ce site.</p>
</section>`,
});

const notFound = page({
  file: '404.html',
  title: 'Page introuvable',
  current: '404',
  body: `
<section class="texte-page texte-page--centre">
  <h1 class="titre-monumental">Cette page n'existe pas.</h1>
  <p class="chapo">L'adresse a peut-être changé. Revenez à l'accueil pour reprendre la visite.</p>
  ${button({ label: "Revenir à l'accueil", href: 'index.html' })}
</section>`,
});

/* ── Jetons de design (couleurs) ───────────────────────── */
const toRgb = (h) => { const n = parseInt(h.slice(1), 16); return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`; };
const tokens = `/* Généré par build.mjs depuis site.config.mjs — ne pas modifier à la main. */
:root {
${Object.entries(site.colors).map(([k, v]) => `  --${k}: ${v};\n  --${k}-rgb: ${toRgb(v)};`).join('\n')}
}
`;

const base = brand.url.replace(/\/$/, '');
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${['', 'contact.html', 'mentions.html'].map((p) => `  <url><loc>${base}/${p}</loc></url>`).join('\n')}
</urlset>
`;
const robots = `User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`;
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="${site.colors.nuit}"/><g stroke="${site.colors.laiton}" fill="none" stroke-width="1.6"><circle cx="20" cy="20" r="13"/><path d="M5 23h30M11 23a9 9 0 0 1 18 0"/></g></svg>\n`;

const out = { 'index.html': index, 'contact.html': contact, 'mentions.html': legal, '404.html': notFound, 'assets/css/tokens.css': tokens, 'sitemap.xml': sitemap, 'robots.txt': robots, 'favicon.svg': favicon };
for (const [f, content] of Object.entries(out)) writeFileSync(ROOT + f, content);
console.log('Pages générées :', Object.keys(out).join(', '));
