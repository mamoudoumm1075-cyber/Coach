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
  addEventListener('pageshow', (e) => { if (e.persisted) corps.classList.remove('part'); });

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    const memePage = url.pathname === location.pathname || (url.pathname.endsWith('/index.html') && location.pathname.endsWith('/')) || (url.pathname.endsWith('/') && location.pathname.endsWith('/index.html'));
    if (memePage && url.hash) {
      // Ancre interne : défilement doux, sans rechargement.
      const cible = document.getElementById(decodeURIComponent(url.hash.slice(1)));
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
    setTimeout(() => { location.href = url.href; }, 650);
  });

  $('[data-haut]')?.addEventListener('click', (e) => {
    e.preventDefault();
    scrollTo({ top: 0, behavior: calme ? 'auto' : 'smooth' });
    $('.logo')?.focus({ preventScroll: true });
  });
}

/* ── En-tête : compacte au défilement, se retire en descendant ── */
function entete() {
  const h = $('[data-entete]');
  if (!h) return;
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
      rendu = mountHorizon(canvas, { scene: canvas.dataset.horizon, reducedMotion: calme, quality: tactile ? 0.7 : 0.75, onReady: () => canvas.classList.add('est-pret') });
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
  if (calme || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('est-visible')); return; }
  const io = new IntersectionObserver((entrees) => {
    for (const en of entrees) if (en.isIntersecting) { en.target.classList.add('est-visible'); io.unobserve(en.target); }
  }, { rootMargin: '0px 0px -12% 0px' });
  els.forEach((e) => io.observe(e));
}

/* ── Parallaxe discrète ────────────────────────────────── */
function parallaxe() {
  if (calme) return;
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
  if (!bloc || calme) return;
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
      if (!flottant.classList.contains('est-visible')) { x = tx = ancreX(); y = ty = e.clientY; }
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
  if (!section || calme) return;
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
  if (!items.length) return;
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
  if (!els.length) return;
  if (calme || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('est-visible')); return; }
  const io = new IntersectionObserver((entrees) => {
    for (const en of entrees) if (en.isIntersecting) { en.target.classList.add('est-visible'); io.unobserve(en.target); }
  }, { threshold: 0.6 });
  els.forEach((e) => io.observe(e));
}

function finale() {
  const section = $('[data-finale]');
  if (!section) return;
  if (calme) { section.classList.add('est-statique'); return; }
  // Seuils de progression (0 → 1) de chaque étape de la mise en scène :
  // 1 obscurité, 2 « il faut qu'on parle », 3 apparition et zoom, 4 la question, 5 la signature.
  const seuils = [0.02, 0.1, 0.3, 0.6, 0.78];
  auDefilement.push(() => {
    const r = section.getBoundingClientRect();
    const p = clamp(-r.top / (r.height - innerHeight));
    seuils.forEach((s, i) => section.classList.toggle(`etape-${i + 1}`, p >= s && r.top < innerHeight * 0.5));
  });
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
formulaire();
surDefilement();
})();
