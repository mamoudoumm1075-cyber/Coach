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
