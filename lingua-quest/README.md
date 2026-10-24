# Lingua Quest

RPG en urban fantasy pour apprendre l’anglais : préparer le TOEIC Listening & Reading et apprendre à parler, environ 20 minutes par jour. Tout tourne dans le téléphone, sans compte ni serveur.

## Installer sur le téléphone

1. Une fois la branche fusionnée dans `main`, GitHub Pages publie l’appli à l’adresse `…/Coach/lingua-quest/`.
2. Ouvrir cette adresse dans Safari (iPhone) ou Chrome (Android).
3. « Partager → Sur l’écran d’accueil » (iPhone) ou « Installer l’application » (Android).

Sans installation : ouvrir directement `lingua-quest-complet.html` (un seul fichier, images, sons et code intégrés, fonctionne même hors ligne ; seules les polices viennent de Google Fonts et sont remplacées par des polices système sans internet).

L’appli fonctionne ensuite hors ligne. Elle a sa propre mémoire : avant de changer d’appareil ou de navigateur, exporte une sauvegarde (Profil → Télécharger ma sauvegarde).

## Organisation

| Dossier | Contenu |
|---|---|
| `data/` | Contenu pédagogique : Codex (`codex.js`), 9 fiches de temps (`tenses.js`), entraînement TOEIC (`toeic.js`), monde, quêtes, dialogues, boss, évaluation et objets (`world.js`). |
| `js/logic.js` | Règles du jeu sans interface : XP, niveaux, maîtrise, révision espacée, série avec joker, difficulté adaptative, comparaison des réponses. |
| `js/content.js` | Assemble les quêtes, la session du jour, les boss et les révisions. |
| `js/play.js` | Moteur de jeu : dialogues, exercices, oral, boss, chronomètre, bilan. |
| `js/codexview.js` | Codex (page et panneau ouvert par-dessus un exercice). |
| `js/app.js` | Sauvegarde, navigation et écrans. |
| `sons/` | Bruitages générés avec ElevenLabs. |
| `serveur/` | Serveur voix Cloudflare (`worker.js`) et son guide d’installation (`GUIDE.md`). |
| `img/` | Illustrations anime urban fantasy (écran titre, 5 héros, carte de la ville, café, boss). |
| `lingua-quest-complet.html` | Version en un seul fichier, générée à partir des fichiers ci-dessus (à régénérer après chaque modification). |

Ajouter un chapitre : un objet dans `CHAPTERS` (`data/world.js`), ses items dans `WORLD_ITEMS`, ses dialogues dans `DIALOGUES`. Les tests vérifient que chaque référence existe.

Mise à jour des fichiers : changer `VERSION` dans `sw.js`, et ajouter tout nouveau fichier à la liste `FILES`.

## Tests

```
cd lingua-quest
npm test                                   # règles du jeu, contenu, serveur voix (36 tests)
python3 -m http.server 8765 &              # puis, avec Playwright installé :
node tests/e2e.cjs                         # parcours complet en taille téléphone, captures dans .captures/
node tests/audit.cjs                       # sauvegarde abîmée, campagne des 6 chapitres, interruptions, export/import
node tests/horsligne.cjs                   # service worker : fichiers en cache, appli jouable sans réseau
```

Fichier unique : `python3 outils/fichier_unique.py` (après chaque modification) fabrique `lingua-quest-complet.html` et refuse de l’écrire s’il manque une image.

## Ce qui fonctionne et ce qui reste à faire

Fonctionne : Tour des examens (6 tests blancs en combat : chaque bonne réponse frappe l’Ombre, test validé = boss vaincu et étage suivant, départ selon ton niveau, difficulté et seuil croissants jusqu’à ton objectif), suivi par notion avec page « Mes progrès » (progression réelle séparée de l’XP, forces, difficultés), entraînement ciblé, révision espacée des exercices ratés, skins évolutifs du héros (menu Apparence, déblocage lié au jeu et à la vraie progression en anglais), jauges « Prêt pour le TOEIC » (réussite pondérée comme le vrai test, comparée à ton objectif) et « Niveau de discussion » (repère A1 à C1), vocabulaire de ton métier (CVC, VMC, BTP, data center), carnet de vocabulaire (chaque mot inconnu noté puis révisé), méthode TOEIC en 5 étapes avec sprint de 4 semaines avant la date d’examen, tests blancs avec analyse de la partie la plus ratée, évaluation initiale, 6 chapitres et leurs boss, quêtes (principales, quotidienne, secondaires, révision, maîtrise, TOEIC, orales, quête de classe), session de 20 minutes, Codex (dictionnaire, décodeur, temps, marqueurs, auxiliaires, verbes irréguliers), révision espacée, XP, niveaux, badges, objets cosmétiques, arbre de compétences, statistiques, progression TOEIC par partie, simulation chronométrée, thèmes sombre et clair, sauvegarde locale, export et import, hors ligne.

Limites honnêtes de cette version :
- Voix ElevenLabs : seulement après avoir installé ton serveur Cloudflare (voir `serveur/GUIDE.md`). Sans lui, l’écoute utilise la voix de synthèse du navigateur ; sans voix du tout, les exercices d’écoute passent en mode texte et comptent comme de la lecture.
- Le micro utilise la transcription ElevenLabs (avec le serveur) ou la reconnaissance vocale du navigateur : les deux vérifient les mots compris, pas l’accent. Sans serveur, elle peut être indisponible dans l’appli installée sur iPhone ; l’oral passe alors en mode écrit.
- Les réponses orales libres sont vérifiées sur des éléments précis (une structure, un mot clé), pas corrigées comme le ferait un professeur.
- Le décodeur de phrases fonctionne sur les phrases du jeu annotées une par une, pas sur n’importe quelle phrase tapée.
- Pas de score TOEIC estimé : seulement la réussite réelle par partie. Les tests blancs font 30 questions (un vrai TOEIC en fait 200 en 2 h). La partie 1 n’a encore que 3 photos (6 questions).
- Pas de compte ni de synchronisation en ligne.
- Apparence du héros : choix parmi 5 illustrations (une par classe, plus « toi »), pas d’éditeur de visage. Les tenues cosmétiques n’ont pas encore d’illustration.
- Les skins évolutifs sont des effets visuels (aura, lumière, glyphes, rayons) appliqués à l’illustration du héros, pas de nouvelles illustrations.
- Testé dans Chromium seulement (téléphone, tablette, ordinateur émulés) : Safari sur iPhone et Firefox n’ont pas pu être testés ici.
- Les jauges sont des indicateurs calculés sur tes résultats dans l’appli : ni score TOEIC, ni certification de niveau, ni évaluation de l’accent.
- Le contenu est une base (184 mots dont 54 de ton métier, 50 verbes irréguliers, 90 questions TOEIC sur les 7 parties, 9 temps, une fiche prépositions) : il doit encore grossir pour tenir sur la durée.
