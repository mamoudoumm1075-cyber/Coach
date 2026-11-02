/**
 * Orée — interactions.
 * Chaque module ne s'active que si son balisage est présent dans la page.
 */
(function () {
'use strict';
const mountHorizon = (...a) => (window.Horizon ? window.Horizon.mountHorizon(...a) : null);

const calme = matchMedia('(prefers-reduced-motion: reduce)').matches;
const tactile = matchMedia('(hover: none), (pointer: coarse)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const modeScenes = document.documentElement.classList.contains('mode-scenes');
let scenesAPI = null; // défini par scenes() en mode scènes
let renduHero = null;

/* ── Boucle de défilement unique (rAF) ─────────────────── */
const auDefilement = [];
let tic = false;
const surDefilement = () => {
  if (tic) return;
  tic = true;
  requestAnimationFrame(() => {
    tic = false;
    const y = window.scrollY;
    for (const f of auDefilement) f(y);
  });
};
addEventListener('scroll', surDefilement, { passive: true });
addEventListener('resize', surDefilement);

/* ── Chargement et transitions de pages ────────────────── */
function transitions() {
  const corps = document.body;
  const charger = () => requestAnimationFrame(() => corps.classList.add('est-charge'));
  if (document.fonts?.ready) Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 900))]).then(charger);
  else charger();

  // Retour arrière depuis le cache : on retire le rideau.
  addEventListener('pageshow', (e) => { if (e.persisted) { corps.classList.remove('part'); renduHero?.setPaused?.(modeScenes && scenesAPI ? scenesAPI.courant() !== 0 : false); } });

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    const memePage = url.pathname === location.pathname || (url.pathname.endsWith('/index.html') && location.pathname.endsWith('/')) || (url.pathname.endsWith('/') && location.pathname.endsWith('/index.html'));
    if (memePage && url.hash) {
      // Ancre interne : défilement doux, sans rechargement.
      const id = decodeURIComponent(url.hash.slice(1));
      if (scenesAPI?.aId(id)) { e.preventDefault(); fermerMenu?.(); scenesAPI.allerA(id); return; }
      const cible = document.getElementById(id);
      if (cible) {
        e.preventDefault();
        fermerMenu?.();
        cible.scrollIntoView({ behavior: calme ? 'auto' : 'smooth' });
        history.pushState(null, '', url.hash);
      }
      return;
    }
    if (calme) return;
    e.preventDefault();
    corps.classList.add('part');
    renduHero?.setPaused?.(true); // on libère le processeur graphique avant de changer de page
    setTimeout(() => { location.href = url.href; }, 650);
  });

  $('[data-haut]')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (scenesAPI) { scenesAPI.aller(0); return; }
    scrollTo({ top: 0, behavior: calme ? 'auto' : 'smooth' });
    $('.logo')?.focus({ preventScroll: true });
  });
}

/* ── En-tête : compacte au défilement, se retire en descendant ── */
function entete() {
  const h = $('[data-entete]');
  if (!h || modeScenes) return; // en mode scènes, le gestionnaire pilote l'en-tête
  let dernier = 0;
  auDefilement.push((y) => {
    h.classList.toggle('est-compacte', y > 40);
    const delta = y - dernier;
    if (Math.abs(delta) < 6 || document.documentElement.classList.contains('menu-ouvert')) return;
    h.classList.toggle('est-cachee', delta > 0 && y > innerHeight * 0.6);
    dernier = y;
  });
  h.addEventListener('focusin', () => h.classList.remove('est-cachee'));

  // Lien actif selon la section visible
  const liens = $$('.nav__lien').map((a) => [a, document.getElementById(new URL(a.href).hash.slice(1))]).filter(([, s]) => s);
  if (!liens.length) return;
  const io = new IntersectionObserver((entrees) => {
    for (const en of entrees) {
      const lien = liens.find(([, s]) => s === en.target)?.[0];
      if (lien) lien.classList.toggle('est-actif', en.isIntersecting);
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  liens.forEach(([, s]) => io.observe(s));
}

/* ── Menu plein écran ──────────────────────────────────── */
let fermerMenu;
function menu() {
  const bouton = $('[data-menu-bouton]');
  const panneau = $('[data-menu]');
  if (!bouton || !panneau) return;
  const texte = $('.menu-bouton__texte', bouton);
  const racine = document.documentElement;
  let dernierFocus;

  const ouvrir = () => {
    dernierFocus = document.activeElement;
    panneau.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => panneau.classList.add('est-ouvert')));
    racine.classList.add('menu-ouvert');
    bouton.setAttribute('aria-expanded', 'true');
    texte.textContent = texte.dataset.ouvert;
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('a', panneau)?.focus({ preventScroll: true }), calme ? 0 : 400);
  };
  fermerMenu = () => {
    if (panneau.hidden) return;
    panneau.classList.remove('est-ouvert');
    racine.classList.remove('menu-ouvert');
    bouton.setAttribute('aria-expanded', 'false');
    texte.textContent = texte.dataset.ferme;
    document.body.style.overflow = '';
    setTimeout(() => { if (!panneau.classList.contains('est-ouvert')) panneau.hidden = true; }, calme ? 0 : 900);
    if (panneau.contains(document.activeElement)) (dernierFocus || bouton).focus({ preventScroll: true });
  };
  bouton.addEventListener('click', () => (panneau.hidden ? ouvrir() : fermerMenu()));
  document.addEventListener('keydown', (e) => {
    if (panneau.hidden) return;
    if (e.key === 'Escape') { fermerMenu(); bouton.focus(); }
    if (e.key === 'Tab') {
      // Piège de focus : bouton du menu + liens du panneau
      const cibles = [bouton, ...$$('a', panneau)];
      const i = cibles.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); cibles.at(-1).focus(); }
      else if (!e.shiftKey && i === cibles.length - 1) { e.preventDefault(); cibles[0].focus(); }
    }
  });
  matchMedia('(min-width: 1025px)').addEventListener('change', (m) => m.matches && fermerMenu());
}

/* ── Hero : paysage génératif en direct et parallaxe ───── */
function hero() {
  const section = $('[data-hero]');
  if (!section) return;
  const media = $('[data-hero-media]', section);
  const canvas = $('[data-horizon]', section);
  let rendu = null;
  if (canvas) {
    try {
      rendu = renduHero = mountHorizon(canvas, { scene: canvas.dataset.horizon, reducedMotion: calme, quality: tactile ? 0.7 : 0.75, onReady: () => canvas.classList.add('est-pret') });
    } catch (err) {
      console.warn('Rendu WebGL indisponible, image fixe conservée.', err);
    }
    if (!rendu) canvas.remove();
  }
  if (calme) return;
  if (rendu && !tactile) {
    section.addEventListener('pointermove', (e) => {
      const r = section.getBoundingClientRect();
      rendu.setMouse((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
    });
  }
  const titre = $('.hero__titre', section);
  if (modeScenes) return;
  auDefilement.push((y) => {
    const h = section.offsetHeight;
    if (y > h) return;
    const p = y / h;
    media.style.transform = `translate3d(0, ${p * 18}vh, 0) scale(${1 + p * 0.12})`;
    media.style.opacity = String(1 - p * 0.6);
    titre.style.transform = `translate3d(0, ${p * -8}vh, 0)`;
  });
}

/* ── Révélation des images (une seule fois) ────────────── */
function cadres() {
  const els = $$('.cadre');
  if (calme || modeScenes || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('est-visible')); return; }
  const io = new IntersectionObserver((entrees) => {
    for (const en of entrees) if (en.isIntersecting) { en.target.classList.add('est-visible'); io.unobserve(en.target); }
  }, { rootMargin: '0px 0px -12% 0px' });
  els.forEach((e) => io.observe(e));
}

/* ── Parallaxe discrète ────────────────────────────────── */
function parallaxe() {
  if (calme || modeScenes) return;
  const els = $$('[data-parallaxe]');
  auDefilement.push(() => {
    const vh = innerHeight;
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) continue;
      const p = (r.top + r.height / 2 - vh / 2) / vh; // -1 … 1
      const cible = el.querySelector('img');
      if (cible) cible.style.translate = `0 ${(p * -6).toFixed(2)}%`;
    }
  });
}

/* ── Manifeste : les mots s'éclairent à la lecture ─────── */
function manifeste() {
  const bloc = $('[data-mots]');
  if (!bloc || calme || modeScenes) return;
  const mots = $$('.mot', bloc);
  auDefilement.push(() => {
    const r = bloc.getBoundingClientRect();
    const vh = innerHeight;
    const p = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.3));
    const n = Math.round(p * mots.length);
    mots.forEach((m, i) => m.classList.toggle('est-lu', i < n));
  });
}

/* ── Univers : image flottante qui suit le pointeur ───── */
function univers() {
  const liste = $('[data-univers]');
  const flottant = $('[data-flottant]');
  if (!liste || !flottant || tactile) return;
  const image = $('img', flottant);
  let x = 0, y = 0, tx = 0, ty = 0, actif = false, raf = 0;
  const suivre = () => {
    x += (tx - x) * (calme ? 1 : 0.12);
    y += (ty - y) * (calme ? 1 : 0.12);
    flottant.style.transform = `translate3d(${x - flottant.offsetWidth / 2}px, ${y - flottant.offsetHeight / 2}px, 0)`;
    if (actif || Math.abs(tx - x) > 0.5) raf = requestAnimationFrame(suivre);
  };
  // L'image se place dans la gouttière entre les titres et les textes,
  // et ne suit le pointeur que verticalement : les titres restent lisibles.
  const ancreX = () => liste.getBoundingClientRect().left + liste.offsetWidth * 0.555;
  liste.addEventListener('pointermove', (e) => {
    tx = ancreX(); ty = e.clientY;
    if (!actif) { actif = true; cancelAnimationFrame(raf); raf = requestAnimationFrame(suivre); }
  });
  $$('[data-univers-item]', liste).forEach((li) => {
    li.addEventListener('pointerenter', (e) => {
      if (!flottant.classList.contains('est-visible')) {
        x = tx = ancreX(); y = ty = e.clientY;
        flottant.style.transform = `translate3d(${x - flottant.offsetWidth / 2}px, ${y - flottant.offsetHeight / 2}px, 0)`;
      }
      if (image.getAttribute('src') !== li.dataset.image) image.src = li.dataset.image;
      flottant.classList.add('est-visible');
    });
  });
  liste.addEventListener('pointerleave', () => { actif = false; flottant.classList.remove('est-visible'); });
  addEventListener('scroll', () => { if (actif) { actif = false; flottant.classList.remove('est-visible'); } }, { passive: true });
}

/* ── Seuil : l'ouverture s'agrandit avec le défilement ── */
function seuil() {
  const section = $('[data-seuil]');
  if (!section || calme || modeScenes) return;
  const ouverture = $('[data-seuil-ouverture]', section);
  const texte = $('.seuil__texte', section);
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  auDefilement.push(() => {
    const r = section.getBoundingClientRect();
    const course = r.height - innerHeight;
    const p = clamp(-r.top / (course * 0.7));
    ouverture.style.setProperty('--p', ease(p).toFixed(4));
    texte.style.setProperty('--t', clamp((p - 0.55) / 0.35).toFixed(3));
  });
}

/* ── Qualités : l'image suit l'élément lu ──────────────── */
function qualites() {
  const items = $$('[data-qualite]');
  const plans = $$('[data-plan]');
  if (!items.length || modeScenes) return;
  const activer = (i) => {
    items.forEach((it, j) => it.classList.toggle('est-actif', j === i));
    plans.forEach((pl, j) => pl.classList.toggle('est-actif', j === i));
  };
  const io = new IntersectionObserver((entrees) => {
    for (const en of entrees) if (en.isIntersecting) activer(Number(en.target.dataset.qualite));
  }, { rootMargin: '-48% 0px -48% 0px' });
  items.forEach((it) => io.observe(it));
}

/* ── Déroulé : le fil se remplit ───────────────────────── */
function deroule() {
  const section = $('[data-deroule]');
  const fil = $('[data-deroule-fil]');
  if (!section || !fil) return;
  if (calme) { fil.style.setProperty('--progres', 1); return; }
  if (modeScenes) return;
  auDefilement.push(() => {
    const r = section.getBoundingClientRect();
    fil.style.setProperty('--progres', clamp((innerHeight * 0.75 - r.top) / (r.height * 0.8)).toFixed(3));
  });
}

/* ── Galerie : visionneuse accessible ──────────────────── */
function galerie() {
  const boutons = $$('[data-galerie-index]');
  const dlg = $('[data-visionneuse]');
  if (!boutons.length || !dlg) return;
  const im = $('[data-visionneuse-img]', dlg);
  const legende = $('[data-visionneuse-legende]', dlg);
  const compte = $('[data-visionneuse-compte]', dlg);
  let i = 0, source;
  const montrer = (n) => {
    i = (n + boutons.length) % boutons.length;
    const b = boutons[i];
    const vignette = $('img', b);
    im.style.opacity = '0';
    im.onload = () => { im.style.transition = 'opacity .5s'; im.style.opacity = '1'; };
    im.src = b.dataset.full;
    im.alt = vignette.alt;
    legende.textContent = b.closest('li').querySelector('.galerie__legende')?.textContent || '';
    compte.textContent = `${i + 1} / ${boutons.length}`;
  };
  boutons.forEach((b, n) => b.addEventListener('click', () => { source = b; montrer(n); dlg.showModal(); document.body.style.overflow = 'hidden'; }));
  $('[data-visionneuse-prec]', dlg).addEventListener('click', () => montrer(i - 1));
  $('[data-visionneuse-suiv]', dlg).addEventListener('click', () => montrer(i + 1));
  $('[data-visionneuse-fermer]', dlg).addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => { document.body.style.overflow = ''; source?.focus({ preventScroll: true }); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.tagName === 'FIGURE') dlg.close(); });
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') montrer(i + 1);
    if (e.key === 'ArrowLeft') montrer(i - 1);
  });
  // Balayage tactile
  let x0 = null;
  dlg.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  dlg.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) montrer(i + (dx < 0 ? 1 : -1));
    x0 = null;
  });
}

/* ── Démonstration pour Damson ─────────────────────────── */
function apartes() {
  const els = $$('[data-aparte]');
  if (!els.length || modeScenes) return;
  if (calme || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('est-visible')); return; }
  const io = new IntersectionObserver((entrees) => {
    for (const en of entrees) if (en.isIntersecting) { en.target.classList.add('est-visible'); io.unobserve(en.target); }
  }, { threshold: 0.6 });
  els.forEach((e) => io.observe(e));
}

/* ── Son de la finale ──────────────────────────────────────
   L'extrait de Damson part au moment où sa photo apparaît (étape 3),
   une seule fois par passage dans la scène, jamais en double.
   Les navigateurs (surtout sur mobile) n'autorisent le son qu'après un
   geste : au premier clic, toucher ou touche, on « déverrouille » le
   lecteur en silence. Si la lecture reste refusée, un bouton apparaît.
   ───────────────────────────────────────────────────────── */
const son = (() => {
  const clip = $('[data-son-damson]');
  if (!clip) return null;
  const bouton = $('[data-son-bouton]');
  const ambiance = $('[data-ambiance]');
  const boutonAmb = $('[data-ambiance-bouton]');
  const volAmb = Number(ambiance?.dataset.volume ?? 0.35);
  const volBas = Number(ambiance?.dataset.volumeBas ?? 0.03);
  let enCours = false, deverrouille = false, ambianceVoulue = true, fondu = 0;
  try { ambianceVoulue = localStorage.getItem('oree-son') !== 'coupe'; } catch { /* stockage indisponible */ }

  const fondre = (el, vers, ms, fin) => {
    if (!el) return;
    cancelAnimationFrame(fondu);
    const de = el.volume, t0 = performance.now();
    const pas = (now) => {
      const t = clamp((now - t0) / ms);
      el.volume = clamp(de + (vers - de) * t);
      if (t < 1) fondu = requestAnimationFrame(pas); else fin?.();
    };
    fondu = requestAnimationFrame(pas);
  };
  const demarrerAmbiance = () => {
    if (!ambiance || !ambianceVoulue) return;
    ambiance.volume = enCours ? volBas : volAmb;
    ambiance.play().catch(() => {});
  };

  // Premier geste : déverrouillage silencieux du lecteur (indispensable sur iOS).
  const deverrouiller = () => {
    if (deverrouille) return;
    deverrouille = true;
    ['pointerdown', 'keydown', 'touchend'].forEach((t) => removeEventListener(t, deverrouiller, true));
    demarrerAmbiance();
    if (enCours) return;
    clip.muted = true;
    const p = clip.play();
    const remettre = () => { if (!enCours) { clip.pause(); clip.currentTime = 0; } clip.muted = false; };
    if (p?.then) p.then(remettre, remettre); else remettre();
  };
  ['pointerdown', 'keydown', 'touchend'].forEach((t) => addEventListener(t, deverrouiller, { capture: true, passive: true }));

  clip.loop = false;
  clip.addEventListener('ended', () => {
    enCours = false;
    if (ambiance && ambianceVoulue) fondre(ambiance, volAmb, 1200);
  });

  const api = {
    precharger() { if (clip.preload !== 'auto') clip.preload = 'auto'; },
    declencher() {
      if (enCours) return; // jamais deux lectures en même temps
      enCours = true;
      bouton.hidden = true;
      if (ambiance && !ambiance.paused) fondre(ambiance, volBas, 450);
      clip.muted = false;
      clip.volume = 1;
      clip.currentTime = 0;
      const p = clip.play();
      p?.catch?.(() => {
        // Lecture refusée par le navigateur : on propose de lancer le son.
        enCours = false;
        bouton.hidden = false;
        if (ambiance && ambianceVoulue && !ambiance.paused) fondre(ambiance, volAmb, 600);
      });
    },
    arreter() {
      bouton.hidden = true;
      if (!enCours) return;
      enCours = false;
      const v = clip.volume, t0 = performance.now();
      const baisse = (now) => {
        const t = clamp((now - t0) / 400);
        clip.volume = clamp(v * (1 - t));
        if (t < 1) requestAnimationFrame(baisse); else { clip.pause(); clip.currentTime = 0; clip.volume = 1; }
      };
      requestAnimationFrame(baisse);
      if (ambiance && ambianceVoulue) fondre(ambiance, volAmb, 900);
    },
    etat: () => ({ enCours, deverrouille, paused: clip.paused, temps: clip.currentTime, bouton: !bouton.hidden, ambiance: ambiance ? { paused: ambiance.paused, volume: +ambiance.volume.toFixed(2) } : null }),
  };
  bouton?.addEventListener('click', () => api.declencher());
  boutonAmb?.addEventListener('click', () => {
    ambianceVoulue = !ambianceVoulue;
    boutonAmb.setAttribute('aria-pressed', String(ambianceVoulue));
    try { localStorage.setItem('oree-son', ambianceVoulue ? 'actif' : 'coupe'); } catch { /* stockage indisponible */ }
    if (ambianceVoulue) demarrerAmbiance(); else ambiance.pause();
  });
  boutonAmb?.setAttribute('aria-pressed', String(ambianceVoulue));
  window.__son = api; // utile pour les tests
  return api;
})();

function finale() {
  const section = $('[data-finale]');
  if (!section) return;
  if (calme) { section.classList.add('est-statique'); return; }
  if (modeScenes) return;
  // Seuils de progression (0 → 1) de chaque étape de la mise en scène :
  // 1 obscurité, 2 « il faut qu'on parle », 3 apparition et zoom, 4 la question, 5 la signature.
  const seuils = [0.02, 0.1, 0.3, 0.6, 0.78];
  auDefilement.push(() => {
    const r = section.getBoundingClientRect();
    const p = clamp(-r.top / (r.height - innerHeight));
    const avait = section.classList.contains('etape-3');
    seuils.forEach((s, i) => section.classList.toggle(`etape-${i + 1}`, p >= s && r.top < innerHeight * 0.5));
    const a = section.classList.contains('etape-3');
    if (a && !avait) son?.declencher();
    else if (!a && avait) son?.arreter();
    if (r.top < innerHeight * 2.5) son?.precharger();
  });
}


/* ─────────────────────────────────────────────────────────
   Navigation par scènes (accueil)
   Chaque section devient une scène plein écran. Un seul index
   actif, une transition à la fois (verrou), des étapes internes
   pour les scènes qui racontent quelque chose (qualités, seuil,
   finale), et les apartés pour Damson joués entre deux scènes.
   ───────────────────────────────────────────────────────── */
function scenes() {
  if (!modeScenes) return;
  const main = $('#contenu');
  const pied = $('.pied');
  if (!main) return;
  const conf = JSON.parse($('#config-scenes')?.textContent || '{}');
  if (pied) { pied.id = pied.id || 'pied'; main.append(pied); }

  // Les apartés sortent du flux : ils deviennent des « cartons » joués pendant les transitions.
  const carton = document.createElement('div');
  carton.className = 'carton';
  carton.setAttribute('aria-live', 'polite');
  document.body.append(carton);
  const apartes = new Map(); // id de la scène qui précède → élément
  $$('[data-aparte]', main).forEach((a) => {
    const avant = a.previousElementSibling;
    if (avant) apartes.set(avant.id || 'hero', a);
    carton.append(a);
  });

  const liste = $$(':scope > section, :scope > footer', main);
  liste.forEach((el) => {
    if (!el.id) el.id = el.classList.contains('hero') ? 'ouverture' : el.className.split(' ')[0];
    el.classList.add('scene');
    el.dataset.cle = el.classList.contains('hero') ? 'hero' : el.id;
  });
  const cle = (el) => el.dataset.cle;

  // Éléments qui entrent en scène, dans l'ordre de lecture.
  const ENTREES = '.titre-grand, .titre-monumental, .titre-section, .chapo, .univers__item, .deroule__fil, .deroule__etape, .galerie__item, .appel__contenu .bouton, .manifeste__figure, .manifeste__texte, .qualites__media, .pied__grille > *, .pied__bas, .pied__signature';
  liste.forEach((el) => {
    if (el.classList.contains('hero') || el.classList.contains('finale') || el.classList.contains('seuil')) return;
    $$(ENTREES, el).forEach((n, i) => { n.dataset.e = ''; n.style.setProperty('--d', `${120 + i * 85}ms`); });
  });
  $$('.manifeste__texte .mot').forEach((m, i) => m.style.setProperty('--w', i));

  /* ── Étapes internes ── */
  const etapes = {
    qualites: (() => {
      const items = $$('[data-qualite]');
      const plans = $$('[data-plan]');
      let i = 0;
      const regler = (n) => { i = n; items.forEach((it, j) => it.classList.toggle('est-actif', j === n)); plans.forEach((pl, j) => pl.classList.toggle('est-actif', j === n)); };
      return {
        entrer: (dir) => regler(dir < 0 ? items.length - 1 : 0),
        suivante: () => (i < items.length - 1 ? (regler(i + 1), true) : false),
        precedente: () => (i > 0 ? (regler(i - 1), true) : false),
        position: () => `${i + 1}/${items.length}`,
      };
    })(),
    seuil: (() => {
      const ouv = $('[data-seuil-ouverture]');
      const txt = $('.seuil__texte');
      let raf = 0;
      const poser = (p) => { ouv?.style.setProperty('--p', p.toFixed(4)); txt?.style.setProperty('--t', clamp((p - 0.55) / 0.4).toFixed(3)); };
      return {
        entrer: () => {
          cancelAnimationFrame(raf);
          if (calme) return poser(1);
          poser(0);
          const t0 = performance.now() + 350, duree = 2600;
          const pas = (now) => {
            const t = clamp((now - t0) / duree);
            poser(t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
            if (t < 1) raf = requestAnimationFrame(pas);
          };
          raf = requestAnimationFrame(pas);
        },
        quitter: () => cancelAnimationFrame(raf),
        reinitialiser: () => poser(0),
      };
    })(),
    finale: (() => {
      const sec = $('[data-finale]');
      if (!sec) return null;
      const temps = [0, 450, 2700, 7700, 9300]; // obscurité, phrase, photo + zoom, question, signature
      let n = 0, minuteurs = [];
      const poser = (k) => {
        if (k >= 3 && n < 3) son?.declencher(); // la photo apparaît : l'extrait part
        n = k;
        for (let j = 1; j <= 5; j++) sec.classList.toggle(`etape-${j}`, j <= k);
      };
      const arreter = () => { minuteurs.forEach(clearTimeout); minuteurs = []; };
      return {
        entrer: () => {
          arreter();
          if (calme) { sec.classList.add('est-statique'); return poser(5); }
          poser(0);
          temps.forEach((t, j) => minuteurs.push(setTimeout(() => poser(j + 1), t + 300)));
        },
        // Avancer pendant la séquence fait passer à l'étape suivante (sans sauter la scène).
        suivante: () => { if (n >= 5) return false; arreter(); poser(n + 1); return true; },
        quitter: () => { arreter(); son?.arreter(); },
        reinitialiser: () => { arreter(); n = 0; for (let j = 1; j <= 5; j++) sec.classList.remove(`etape-${j}`); },
      };
    })(),
  };

  /* ── Indicateur et commandes visibles ── */
  const nav = document.createElement('nav');
  nav.className = 'scenes-nav';
  nav.setAttribute('aria-label', 'Scènes');
  nav.innerHTML = `
    <ol class="scenes-nav__reperes">${liste.map((el, i) => `<li><button type="button" data-aller="${i}" aria-label="${esc(conf.noms?.[cle(el)] || el.id)}"><span></span></button></li>`).join('')}</ol>
    <div class="scenes-nav__pied">
      <button type="button" class="scenes-nav__fleche" data-prec aria-label="Scène précédente"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>
      <p class="scenes-nav__compte"><span data-num></span><span class="scenes-nav__nom" data-nom></span></p>
      <button type="button" class="scenes-nav__fleche" data-suiv aria-label="Scène suivante"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>
    </div>
    <p class="scenes-nav__astuce" data-astuce>${tactile ? 'Glissez vers le haut pour avancer' : 'Double-cliquez pour avancer'}<small>${tactile ? 'ou touchez les flèches' : 'Flèches du clavier ou molette pour naviguer'}</small></p>
    <p class="sr" aria-live="polite" data-annonce></p>`;
  document.body.append(nav);
  const ligne = document.createElement('div');
  ligne.className = 'scenes-ligne';
  document.body.append(ligne);
  function esc(t) { return String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }

  const entete = $('[data-entete]');
  const liensNav = $$('.nav__lien');
  let courant = 0, occupe = false, finVerrou = 0, navigations = 0, passerCarton = null;

  const majInterface = () => {
    const el = liste[courant];
    $$('[data-aller]', nav).forEach((b, i) => { b.classList.toggle('est-actif', i === courant); b.toggleAttribute('aria-current', i === courant); });
    $('[data-num]', nav).textContent = `${String(courant + 1).padStart(2, '0')} / ${String(liste.length).padStart(2, '0')}`;
    $('[data-nom]', nav).textContent = conf.noms?.[cle(el)] || '';
    $('[data-prec]', nav).disabled = courant === 0;
    $('[data-suiv]', nav).disabled = courant === liste.length - 1 && !etapeRestante();
    $('[data-annonce]', nav).textContent = `Scène ${courant + 1} sur ${liste.length} : ${conf.noms?.[cle(el)] || ''}`;
    entete?.classList.toggle('est-compacte', courant > 0);
    liensNav.forEach((a) => a.classList.toggle('est-actif', new URL(a.href).hash === `#${el.id}`));
    document.documentElement.dataset.scene = cle(el);
    if (courant >= liste.length - 4) son?.precharger(); // l'extrait se charge en approchant de la finale
    $('[data-flottant]')?.classList.remove('est-visible');
    if (renduHero?.setPaused) renduHero.setPaused(courant !== 0);
    const h = courant === 0 ? location.pathname + location.search : `#${el.id}`;
    history.replaceState(null, '', h);
  };
  const etapeRestante = () => cle(liste[courant]) === 'finale' && !liste[courant].classList.contains('etape-5');

  const activer = (el, dir) => {
    el.classList.add('est-active');
    el.removeAttribute('inert');
    el.removeAttribute('aria-hidden');
    el.dataset.dir = dir < 0 ? 'prec' : 'suiv';
    el.scrollTop = dir < 0 && el.scrollHeight > el.clientHeight ? el.scrollHeight : 0;
    etapes[cle(el)]?.entrer?.(dir);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('est-entree')));
  };
  const desactiver = (el) => {
    el.classList.remove('est-active', 'est-entree', 'est-sortie', 'est-sortante');
    el.setAttribute('inert', '');
    el.setAttribute('aria-hidden', 'true');
    etapes[cle(el)]?.quitter?.();
    etapes[cle(el)]?.reinitialiser?.();
  };

  /* ── Effets de transition (Web Animations) ── */
  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const effets = {
    horizon(entree, sortie, dir) {
      ligne.animate([{ transform: 'scaleX(0)', opacity: 1 }, { transform: 'scaleX(1)', opacity: 1, offset: 0.35 }, { transform: 'scaleX(1)', opacity: 0 }], { duration: 1400, easing: ease });
      sortie.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(0.35)' }], { duration: 1400, easing: ease, fill: 'forwards' });
      return entree.animate([{ clipPath: 'inset(50% 0 50% 0)' }, { clipPath: 'inset(50% 0 50% 0)', offset: 0.3 }, { clipPath: 'inset(0% 0 0% 0)' }], { duration: 1400, easing: ease });
    },
    volet(entree, sortie, dir) {
      const s = dir > 0 ? 1 : -1;
      sortie.animate([{ transform: 'translateY(0)', filter: 'brightness(1)' }, { transform: `translateY(${-22 * s}%)`, filter: 'brightness(0.3)' }], { duration: 1150, easing: ease, fill: 'forwards' });
      return entree.animate([{ transform: `translateY(${100 * s}%)` }, { transform: 'translateY(0)' }], { duration: 1150, easing: ease });
    },
    rideau(entree, sortie, dir) {
      const s = dir > 0 ? 1 : -1;
      sortie.animate([{ transform: 'translateX(0)', filter: 'brightness(1)' }, { transform: `translateX(${-14 * s}%)`, filter: 'brightness(0.35)' }], { duration: 1200, easing: ease, fill: 'forwards' });
      return entree.animate([{ clipPath: s > 0 ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 1200, easing: ease });
    },
    iris(entree, sortie, dir, origine) {
      const x = origine ? `${origine.x}px` : '50%', y = origine ? `${origine.y}px` : '50%';
      sortie.animate([{ transform: 'scale(1)', filter: 'brightness(1)' }, { transform: 'scale(1.06)', filter: 'brightness(0.3)' }], { duration: 1300, easing: ease, fill: 'forwards' });
      return entree.animate([{ clipPath: `circle(0% at ${x} ${y})` }, { clipPath: `circle(150% at ${x} ${y})` }], { duration: 1300, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' });
    },
    fondu(entree, sortie) {
      sortie.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1100, easing: ease, fill: 'forwards' });
      return entree.animate([{ opacity: 0, filter: 'blur(18px)', transform: 'scale(1.06)' }, { opacity: 1, filter: 'blur(0px)', transform: 'scale(1)' }], { duration: 1300, easing: ease });
    },
    calme(entree, sortie) {
      sortie.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' });
      return entree.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250 });
    },
  };

  const attendre = (ms) => new Promise((r) => { const t = setTimeout(r, ms); passerCarton = () => { clearTimeout(t); r(); }; });

  async function jouerCarton(a) {
    const style = [...a.classList].find((c) => c.startsWith('aparte--'))?.slice(8);
    const texte = a.getAttribute('aria-label') || '';
    const duree = calme ? 1800 : style === 'machine' ? texte.length * 38 + 1500 : style === 'mots' ? 2000 + texte.split(' ').length * 75 : 2500;
    carton.classList.add('est-ouvert');
    a.classList.add('est-joue');
    await attendre(calme ? 50 : 450);
    a.classList.add('est-visible');
    let machine = 0;
    if (style === 'machine') {
      // Machine à écrire : chaque lettre apparaît et le curseur la suit.
      const lettres = $$('.l', a);
      const curseur = $('.aparte__curseur', a);
      let k = 0;
      const taper = () => {
        if (k >= lettres.length) return;
        lettres[k].classList.add('est-tape');
        lettres[k].after(curseur);
        k++;
        machine = setTimeout(taper, calme ? 0 : 38);
      };
      if (calme) lettres.forEach((l) => l.classList.add('est-tape')); else taper();
    }
    await attendre(duree);
    clearTimeout(machine);
    $$('.l', a).forEach((l) => l.classList.add('est-tape'));
    passerCarton = null;
  }
  function fermerCarton() {
    carton.classList.add('est-ferme');
    setTimeout(() => {
      carton.classList.remove('est-ouvert', 'est-ferme');
      $$('.aparte', carton).forEach((x) => x.classList.remove('est-joue', 'est-visible'));
      $$('.l.est-tape', carton).forEach((l) => l.classList.remove('est-tape'));
      $$('.aparte__curseur', carton).forEach((c) => c.parentElement.append(c));
    }, calme ? 100 : 900);
  }

  async function aller(cible, origine) {
    if (occupe || cible === courant || cible < 0 || cible >= liste.length) return;
    occupe = true;
    navigations++;
    $('[data-astuce]', nav).classList.add('est-cachee'); // l'astuce a servi : elle s'efface
    const dir = cible > courant ? 1 : -1;
    const sortie = liste[courant];
    const entree = liste[cible];
    const aparte = dir > 0 && cible === courant + 1 ? apartes.get(cle(sortie)) : null;

    // 1. Sortie du contenu de la scène courante
    sortie.classList.add('est-sortie');
    await new Promise((r) => setTimeout(r, calme ? 0 : 380));

    // 2. Aparté pour Damson entre les deux scènes (en avançant seulement)
    if (aparte) {
      await jouerCarton(aparte);
      sortie.getAnimations().forEach((x) => x.cancel());
      desactiver(sortie);
      courant = cible;
      activer(entree, dir);
      majInterface();
      fermerCarton();
      await new Promise((r) => setTimeout(r, calme ? 0 : 500));
    } else {
      // 3. Transition propre à la scène qui entre
      const type = calme ? 'calme' : conf.transitions?.[cle(entree)] || 'fondu';
      sortie.classList.add('est-sortante');
      entree.classList.add('est-entrante');
      courant = cible;
      activer(entree, dir);
      majInterface();
      const anim = (effets[type] || effets.fondu)(entree, sortie, dir, origine);
      try { await anim.finished; } catch { /* annulée */ }
      sortie.getAnimations().forEach((x) => x.cancel());
      entree.classList.remove('est-entrante');
      desactiver(sortie);
    }
    occupe = false;
    finVerrou = performance.now() + (calme ? 150 : 450);
    majInterface();
  }

  const suivante = (origine) => {
    if (occupe) { passerCarton?.(); return; }      // un nouvel ordre pendant un aparté le raccourcit
    if (performance.now() < finVerrou) return;
    const et = etapes[cle(liste[courant])];
    if (et?.suivante?.()) { majInterface(); return; }
    aller(courant + 1, origine);
  };
  const precedente = () => {
    if (occupe || performance.now() < finVerrou) return;
    const et = etapes[cle(liste[courant])];
    if (et?.precedente?.()) return;
    aller(courant - 1);
  };

  /* ── Mise en place ── */
  const depart = Math.max(0, liste.findIndex((el) => `#${el.id}` === location.hash));
  liste.forEach((el, i) => (i === depart ? null : desactiver(el)));
  courant = depart;
  activer(liste[depart], 1);
  majInterface();

  /* ── Commandes ── */
  const interactif = (t) => t.closest('a, button, input, textarea, select, label, dialog, [data-entete], .menu, .scenes-nav, .galerie__grille');
  const bloque = () => document.documentElement.classList.contains('menu-ouvert') || !!$('dialog[open]');

  // Double-clic : avancer (Maj + double-clic : revenir). On évite la sélection de texte du double-clic.
  document.addEventListener('mousedown', (e) => { if (e.detail > 1 && !interactif(e.target) && main.contains(e.target)) e.preventDefault(); });
  document.addEventListener('dblclick', (e) => {
    if (bloque() || interactif(e.target) || !(main.contains(e.target) || carton.contains(e.target))) return;
    getSelection()?.removeAllRanges();
    if (e.shiftKey) precedente(); else suivante({ x: e.clientX, y: e.clientY });
  });
  carton.addEventListener('click', () => passerCarton?.());

  document.addEventListener('keydown', (e) => {
    if (bloque() || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest('input, textarea, select, [contenteditable]')) return;
    const k = e.key;
    if (['ArrowRight', 'PageDown'].includes(k) || (k === ' ' && !e.target.closest('button, a'))) { e.preventDefault(); suivante(); }
    else if (['ArrowLeft', 'PageUp'].includes(k)) { e.preventDefault(); precedente(); }
    else if (k === 'ArrowDown' || k === 'ArrowUp') {
      const el = liste[courant];
      const bord = k === 'ArrowDown' ? el.scrollTop + el.clientHeight >= el.scrollHeight - 2 : el.scrollTop <= 0;
      if (bord) { e.preventDefault(); k === 'ArrowDown' ? suivante() : precedente(); }
    }
    else if (k === 'Home') { e.preventDefault(); aller(0); }
    else if (k === 'End') { e.preventDefault(); aller(liste.length - 1); }
  });

  // Molette : une scène par geste. Si la scène déborde, on la laisse d'abord défiler.
  let cumul = 0, derniereMolette = 0, geste = false;
  addEventListener('wheel', (e) => {
    if (bloque() || e.ctrlKey) return;
    const el = liste[courant];
    const bas = e.deltaY > 0;
    const peutDefiler = el.contains(e.target) && el.scrollHeight > el.clientHeight + 2 && (bas ? el.scrollTop + el.clientHeight < el.scrollHeight - 2 : el.scrollTop > 0);
    const now = performance.now();
    if (now - derniereMolette > 260) { geste = false; cumul = 0; }
    derniereMolette = now;
    if (peutDefiler) return;
    e.preventDefault();
    if (geste || occupe || now < finVerrou) return; // l'inertie du pavé tactile ne déclenche pas deux scènes
    cumul += e.deltaY;
    if (Math.abs(cumul) > 40) { geste = true; cumul > 0 ? suivante() : precedente(); }
  }, { passive: false });

  // Tactile : balayage vertical ou horizontal.
  let t0 = null;
  addEventListener('touchstart', (e) => {
    if (bloque() || e.touches.length > 1) { t0 = null; return; }
    const el = liste[courant];
    t0 = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: performance.now(), haut: el.scrollTop <= 0, bas: el.scrollTop + el.clientHeight >= el.scrollHeight - 2 };
  }, { passive: true });
  addEventListener('touchend', (e) => {
    if (!t0 || bloque()) return;
    const dx = e.changedTouches[0].clientX - t0.x, dy = e.changedTouches[0].clientY - t0.y;
    const rapide = performance.now() - t0.t < 900;
    const d = t0; t0 = null;
    if (!rapide) return;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.3) { dx < 0 ? suivante() : precedente(); return; }
    if (Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx)) {
      if (dy < 0 && d.bas) suivante();
      else if (dy > 0 && d.haut) precedente();
    }
  }, { passive: true });

  nav.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-suiv')) suivante();
    else if (b.hasAttribute('data-prec')) precedente();
    else if (b.dataset.aller) aller(Number(b.dataset.aller));
  });

  // Redimensionnement : la scène active reste en place, sans animation parasite.
  let rt = 0;
  addEventListener('resize', () => {
    document.documentElement.classList.add('redimensionne');
    clearTimeout(rt);
    rt = setTimeout(() => document.documentElement.classList.remove('redimensionne'), 200);
  });

  const index = (id) => liste.findIndex((el) => el.id === id || cle(el) === id);
  scenesAPI = {
    aId: (id) => index(id) >= 0,
    allerA: (id) => aller(index(id)),
    aller,
    suivante,
    precedente,
    courant: () => courant,
    etat: () => ({ courant, occupe, verrou: Math.round(finVerrou - performance.now()) }),
  };
  window.__scenes = scenesAPI; // utile pour les tests
}

/* ── Formulaire de contact ─────────────────────────────── */
function formulaire() {
  const f = $('[data-formulaire]');
  if (!f) return;
  const statut = $('[data-statut]', f);
  const regles = {
    nom: (v) => (v.trim().length >= 2 ? '' : 'Indiquez votre nom.'),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Indiquez une adresse e-mail valide, par exemple nom@domaine.fr.'),
    message: (v) => (v.trim().length >= 10 ? '' : 'Écrivez quelques mots, au moins 10 caractères.'),
  };
  const verifier = (champ) => {
    const msg = regles[champ.name]?.(champ.value) ?? '';
    const bloc = champ.closest('.champ');
    const err = $('.champ__erreur', bloc);
    bloc.classList.toggle('a-erreur', !!msg);
    champ.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (err) { err.textContent = msg; champ.setAttribute('aria-describedby', err.id); }
    return !msg;
  };
  const champs = Object.keys(regles).map((n) => f.elements[n]);
  champs.forEach((c) => {
    c.addEventListener('blur', () => c.value && verifier(c));
    c.addEventListener('input', () => c.closest('.champ').classList.contains('a-erreur') && verifier(c));
  });
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const invalides = champs.filter((c) => !verifier(c));
    if (invalides.length) { invalides[0].focus(); statut.textContent = 'Vérifiez les champs signalés.'; return; }
    const data = Object.fromEntries(new FormData(f));
    const bouton = $('button[type="submit"]', f);
    if (f.dataset.endpoint) {
      bouton.disabled = true;
      statut.textContent = 'Envoi en cours…';
      try {
        const r = await fetch(f.dataset.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
        if (!r.ok) throw new Error(r.status);
        f.reset();
        statut.textContent = 'Message envoyé. Nous vous répondons personnellement.';
      } catch {
        statut.textContent = `L'envoi n'a pas abouti. Réessayez, ou écrivez directement à ${f.dataset.email}.`;
      } finally {
        bouton.disabled = false;
      }
      return;
    }
    // Sans service d'envoi : ouverture de la messagerie avec le message prérempli.
    const corps = `${data.message}\n\n${data.nom}\n${data.email}`;
    location.href = `mailto:${f.dataset.email}?subject=${encodeURIComponent(data.objet)}&body=${encodeURIComponent(corps)}`;
    statut.textContent = 'Votre messagerie s’ouvre avec le message prérempli. Il ne reste qu’à l’envoyer.';
  });
}

transitions();
entete();
menu();
hero();
cadres();
parallaxe();
manifeste();
univers();
seuil();
qualites();
deroule();
galerie();
apartes();
finale();
scenes();
formulaire();
surDefilement();
})();
