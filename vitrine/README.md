# Vitrine (identité temporaire « Orée »)

Site vitrine premium, sombre et cinématographique, conçu pour accueillir n'importe quelle marque.
HTML statique généré, CSS et JavaScript natifs : aucune dépendance à l'exécution, aucun framework.

## Voir le site

```bash
node outils/serveur.mjs        # puis http://localhost:4173/
```

Le site est 100 % statique : il peut être publié tel quel (GitHub Pages, Netlify, n'importe quel hébergeur).

## Adapter à votre marque

Tout se règle dans **`site.config.mjs`**, puis :

```bash
node build.mjs                 # regénère les pages HTML, le sitemap et les couleurs
```

| Élément | Où |
| --- | --- |
| Nom, accroche, description SEO, URL | `brand` |
| Logo | `brand.logoSrc` (fichier SVG ou PNG). Vide : monogramme provisoire |
| Couleurs | `colors` (devient `assets/css/tokens.css`) |
| Menu et bouton principal | `nav`, `primaryCta` |
| Sections affichées et leur ordre | `sections` |
| Textes de chaque section | `hero`, `manifeste`, `univers`, `seuil`, `qualites`, `deroule`, `galerie`, `appel` |
| Images | `images` (voir ci-dessous) |
| Formulaire | `contact.email`, `contact.endpoint`, `contact.subjects` |
| Coordonnées, réseaux, pied de page | `coordinates`, `socials`, `footer` |

Les éléments entre crochets (`[Adresse — à définir]`…) sont des placeholders à remplacer, comme la page `mentions.html`.

### Images

Les visuels actuels sont **génératifs** : un moteur WebGL (`assets/js/horizon.js`) peint des paysages
nocturnes (lac, brume, ciel étoilé, rivage, braise, seuil de lumière, eau, pierre). Le hero l'utilise en direct ;
les autres emplacements utilisent des images fixes produites par :

```bash
node outils/rendre-images.mjs  # nécessite Playwright et ffmpeg
```

Pour utiliser vos photos, remplacez l'entrée correspondante dans `images` :

```js
lac: { src: 'assets/img/ma-photo.webp', width: 2400, height: 1350, alt: 'Description de la photo' },
// ou plusieurs tailles :
lac: { srcset: [['assets/img/p-1200.webp', 1200], ['assets/img/p-2400.webp', 2400]], width: 2400, height: 1350, alt: '…' },
```

Pour le hero : `hero.live: false` affiche seulement l'image ; `hero.video: 'assets/video/hero.mp4'` affiche une vidéo.

### Formulaire de contact

- Sans `contact.endpoint` : le formulaire valide les champs puis ouvre la messagerie du visiteur avec le message prérempli.
- Avec `contact.endpoint` (Formspree, Basin, votre API…) : envoi en `POST` JSON, avec messages de succès et d'erreur.

## Structure

```
site.config.mjs        contenu et réglages (le seul fichier à modifier)
build.mjs              générateur des pages
index.html …           pages générées (ne pas modifier à la main)
assets/css/main.css    styles ; tokens.css est généré
assets/js/main.js      interactions (menu, transitions, défilement, galerie, formulaire)
assets/js/horizon.js   moteur de paysages WebGL
assets/fonts/          Bodoni Moda et Hanken Grotesk (licence SIL OFL)
outils/                serveur local, rendu des visuels
```

## Qualité

- Responsive mobile, tablette, ordinateur ; menu plein écran avec piège de focus et touche Échap.
- `prefers-reduced-motion` respecté : plus d'animation, hero figé, séquences remplacées par leur état final.
- Navigation clavier, lien d'évitement, focus visible, visionneuse en `<dialog>` (flèches, Échap, balayage).
- SEO : HTML complet côté serveur, balises Open Graph, données structurées, `sitemap.xml`, `robots.txt`.
- Performance : polices auto-hébergées et préchargées, images WebP responsives et chargées à la demande,
  rendu WebGL à résolution adaptative, mis en pause hors écran.

## La démonstration pour Damson

Le bloc `damson` de `site.config.mjs` ajoute :

- cinq apartés entre les grandes sections, chacun avec sa propre apparition (`trace`, `marge`, `mots`, `flou`, `machine`) ;
- une séquence finale au défilement : l'écran s'assombrit, « Bon Damson… il faut qu'on parle. », apparition de sa photo
  en ouverture d'iris puis trois coupes de zoom sur le visage (zoom uniforme, la photo n'est jamais déformée),
  la question, puis la signature.

`damson.enabled: false` retire l'ensemble. La photo (`assets/img/damson-*.webp`) a été convertie sans ses métadonnées.

## Navigation par scènes (accueil)

Avec `navigation.mode: 'scenes'`, chaque section de l'accueil devient une scène plein écran :

| Commande | Effet |
| --- | --- |
| Double-clic | scène suivante (Maj + double-clic : précédente) |
| Flèche droite / gauche, Page suivante / précédente, Espace | suivante / précédente |
| Molette | une scène par geste (une scène trop haute défile d'abord à l'intérieur) |
| Balayage vers le haut ou vers la gauche (mobile) | suivante ; dans l'autre sens : précédente |
| Repères à droite, flèches en bas | aller directement à une scène |

Les apartés pour Damson se jouent entre deux scènes quand on avance ; une nouvelle commande les raccourcit.
Les qualités et la finale ont des étapes internes. Chaque scène a sa transition d'entrée (`navigation.transitions`).
L'adresse suit la scène active (`…/vitrine/#galerie` ouvre directement la galerie).
Sans JavaScript, la page reste une page classique qui défile.

## Son de la finale

`audio.damson` (`assets/audio/damson.mp3`) part au moment exact où la photo de Damson apparaît, une fois par passage
dans la finale, sans boucle ; photo et textes restent affichés après. Quitter la finale coupe l'extrait en fondu.
Le premier geste du visiteur (clic, toucher, touche) déverrouille le son en silence, ce qui le rend compatible avec
les navigateurs mobiles. Si le navigateur bloque quand même la lecture (par exemple en ouvrant directement
`…/vitrine/#finale`), un bouton « Lancer le son » apparaît.

`audio.ambiance` accepte une piste d'ambiance (en boucle, avec un bouton « Son » dans l'en-tête) : elle est baissée
pendant l'extrait (`volumeAmbianceBaisse`) puis remonte. Vide par défaut.
