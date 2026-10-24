# Coach

Application autonome de suivi (séances, bilans, progression). Tout tourne dans le téléphone : pas de serveur, pas de compte.

## Installer sur le téléphone

1. Héberger le dossier (ex. GitHub Pages : Settings → Pages → branche `main`, dossier racine).
2. Ouvrir l'adresse dans Safari (iPhone) ou Chrome (Android).
3. « Partager → Sur l'écran d'accueil » (iPhone) ou « Installer l'application » (Android).

Après la première ouverture, l'app fonctionne **hors ligne**.

## Données

- Enregistrées automatiquement dans le téléphone.
- Onglet Progression → « Télécharger un fichier » pour garder une copie, « Importer un fichier » pour la restaurer.
- Mise à jour des fichiers : changer `VERSION` dans `sw.js`.

## Contenu évolutif

`contenu.json` contient les niveaux (selon le meilleur poids atteint), les exercices bonus, les messages d'encouragement et les idées repas. L'appli le recharge à chaque ouverture. Une routine hebdomadaire l'enrichit automatiquement (nouveaux messages, repas, exercices, rubrique « nouveautés »).

## Vraies notifications

L'appli envoie de vraies notifications, même fermée, grâce à un petit envoyeur GitHub (`.github/workflows/notifs.yml`, lancé toutes les 5 minutes).

1. Ouvrir l'appli installée (iPhone : depuis l'icône de l'écran d'accueil, iOS 16.4 ou plus ; Android : Chrome).
2. Progression → « Activer les notifications » → autoriser → « Copier le code ».
3. GitHub → dépôt Coach → Settings → Secrets and variables → Actions → New repository secret, nom `COACH_PUSH`, coller le code.
4. Actions → « Notifications Coach » → Run workflow : une notif d'essai arrive.

Après un changement d'heure dans l'appli, refaire les étapes 2 et 3. GitHub met en pause les tâches planifiées d'un dépôt sans activité depuis 60 jours : il suffit alors de la réactiver dans l'onglet Actions.

## Ma Paie

Application de budget (salaire, charges, dépenses, épargne), dans `ma-paie.html`. Même principe que Coach : tout reste dans le téléphone.

- Adresse : `…/Coach/ma-paie.html` (une fois la branche fusionnée dans `main`, GitHub Pages la publie).
- Installer : ouvrir l'adresse dans Safari → Partager → « Sur l'écran d'accueil ». Elle fonctionne alors hors ligne (`ma-paie-sw.js`, limité aux fichiers `ma-paie*`).
- **Important :** l'appli installée a sa propre mémoire. Avant d'installer, télécharger la sauvegarde (.json) dans Safari, puis l'importer dans l'appli installée.
- Import de relevés : Dépenses → « Importer un relevé bancaire ». Fichiers CSV (Société Générale : site internet → télécharger les opérations ; Revolut : Relevé au format Excel). Les PDF ne sont pas lus.
- Fichiers : `ma-paie.html`, `ma-paie-sw.js`, `ma-paie.webmanifest`, `ma-paie-icon-*.png`. `ma-paie.xlsx` est la version Excel d'exemple.

## Lingua Quest

RPG pour apprendre l’anglais (TOEIC + oral), dans le dossier `lingua-quest/`. Même principe : tout reste dans le téléphone. Détails, installation et limites : `lingua-quest/README.md`.
