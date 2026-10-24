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
npm test                                   # règles du jeu et cohérence du contenu
python3 -m http.server 8765 &              # puis, avec Playwright installé :
node tests/e2e.cjs                         # parcours complet en taille téléphone, captures dans .captures/
```

## Ce qui fonctionne et ce qui reste à faire

Fonctionne : création du héros, évaluation initiale, 6 chapitres et leurs boss, quêtes (principales, quotidienne, secondaires, révision, maîtrise, TOEIC, orales, quête de classe), session de 20 minutes, Codex (dictionnaire, décodeur, temps, marqueurs, auxiliaires, verbes irréguliers), révision espacée, XP, niveaux, badges, objets cosmétiques, arbre de compétences, statistiques, progression TOEIC par partie, simulation chronométrée, thèmes sombre et clair, sauvegarde locale, export et import, hors ligne.

Limites honnêtes de cette version :
- Voix ElevenLabs : seulement après avoir installé ton serveur Cloudflare (voir `serveur/GUIDE.md`). Sans lui, l’écoute utilise la voix de synthèse du navigateur ; sans voix du tout, les exercices d’écoute passent en mode texte et comptent comme de la lecture.
- Le micro utilise la transcription ElevenLabs (avec le serveur) ou la reconnaissance vocale du navigateur : les deux vérifient les mots compris, pas l’accent. Sans serveur, elle peut être indisponible dans l’appli installée sur iPhone ; l’oral passe alors en mode écrit.
- Les réponses orales libres sont vérifiées sur des éléments précis (une structure, un mot clé), pas corrigées comme le ferait un professeur.
- Le décodeur de phrases fonctionne sur les phrases du jeu annotées une par une, pas sur n’importe quelle phrase tapée.
- Pas de score TOEIC estimé : seulement la réussite réelle par partie. La partie 1 (photographies) n’est pas encore là.
- Pas de compte ni de synchronisation en ligne.
- Apparence du héros : choix parmi 5 illustrations (une par classe, plus « toi »), pas d’éditeur de visage. Les tenues cosmétiques n’ont pas encore d’illustration.
- Les 6 boss partagent une illustration, teintée différemment pour chacun.
- Le contenu est une première base (environ 95 mots, 50 verbes irréguliers, 30 questions TOEIC, 9 temps) : il doit grossir pour tenir sur la durée.
