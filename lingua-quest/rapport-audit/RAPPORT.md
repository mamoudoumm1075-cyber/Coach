# Lingua Quest — Rapport de validation technique avant publication

Date : 1er novembre 2026 · Version : branche `main` après la PR #29 (audit de fiabilité), plus les ajouts de cette validation.
Tous les chiffres ci-dessous viennent des journaux du dossier `rapport-audit/journaux/`, produits par la dernière campagne complète.

## 1. Version de départ

Aucune autre version n’a été reçue : pas de fichier joint, et rien de plus récent sur GitHub.
La validation porte donc sur la dernière version publiée (`main`).
Les chiffres cités dans la demande (« 42 tests unitaires », « 23 fichiers », « erreur GPU ») ne correspondent pas à cette version.
Ils viennent probablement d’une copie traitée ailleurs.

## 2. Environnement de test (journal `00-environnement.txt`)

| Élément | Version |
|---|---|
| Node.js | v22.22.0 |
| npm | 10.9.4 |
| Playwright | 1.63.0, épinglé dans `package.json` (`devDependencies`) et installé par `npm install` |
| Chromium | 153.0.8010.12 (navigateur fourni avec cette version de Playwright) |

- Chromium démarre sans erreur, sans réglage particulier : l’erreur GPU décrite ne se reproduit pas ici.
- Aucun code de l’appli n’a été modifié pour l’environnement de test.

**Réglage propre aux tests :** l’anti double appui (350 ms) est mis à 0 par `window.__LQ_GUARD_MS` dans les suites qui cliquent très vite.
Il reste actif et testé dans `robustesse.cjs`.

## 3. Résultats des tests (dernière campagne complète)

| Suite | Cible | Résultat | Durée |
|---|---|---|---|
| `npm test` (unitaires) | règles du jeu, contenu, serveur voix | **40/40** | < 1 s |
| `e2e.cjs` | site local | **69 ok, 0 échec** | 1 min 50 |
| `audit.cjs` | site local | **25 ok, 0 échec** | 2 min 15 |
| `horsligne.cjs` | site local + service worker | **13 ok, 0 échec** | 4 s |
| `son.cjs` | site local | **14 ok, 0 échec** | 20 s |
| `robustesse.cjs` | site local | **14 ok, 0 échec** | 43 s |
| `validation.cjs` *(nouvelle)* | site local + fichier autonome + ordinateur | **33 ok, 0 échec** | 30 s |
| `son.cjs` | fichier autonome (`file://`) | **14 ok, 0 échec** | — |
| `audit.cjs` | fichier autonome (`file://`) | **25 ok, 0 échec** | — |
| `robustesse.cjs` | fichier autonome (`file://`) | **14 ok, 0 échec** | — |

**Total : 40 tests unitaires et 221 vérifications dans le navigateur, 0 échec.**

- `e2e` et `horsligne` ne tournent pas sur le fichier autonome : ils testent le service worker, qui n’existe pas sans serveur.
- `validation.cjs` couvre le fichier autonome dans sa section 5.

### Scénarios critiques demandés, et où ils sont prouvés

| Scénario | Preuve (suite : vérification) |
|---|---|
| Plusieurs appuis rapides sur Écouter | robustesse : « jamais deux voix en file (max 1) » |
| Interruption d’une voix en cours | robustesse : réécoute en dialogue, arrière-plan « la voix est coupée » |
| Réécoute pendant un dialogue | robustesse : « réécouter pendant la lecture ne superpose pas les voix » |
| Audio suspendu | robustesse : « son suspendu : Tester le son répond » |
| Reprise après arrière-plan | robustesse : arrière-plan puis retour, la partie continue sans erreur |
| Délai maximal du serveur vocal + bascule vers la voix du navigateur | robustesse : « relais par la voix du navigateur en 12 s » |
| Micro : autorisation refusée (navigateur et serveur) | validation : « micro refusé : message », « la réponse écrite s’ouvre », « bouton pas resté bloqué » |
| Micro qui ne termine jamais | robustesse : « libéré après 18 s avec un message » |
| Arrêt automatique | validation : « arrêt automatique après 1,5 s de silence, puis transcription (3,2 s) » |
| Libération des pistes audio | validation : « la piste du micro est libérée » (arrêt automatique et manuel) |
| Nouvel essai après un échec | validation (2 fois) et robustesse |
| Double validation | robustesse (double appui) ; validation : « une seule réponse enregistrée », « XP d’une seule réponse (+10) » |
| Attribution des XP | validation : « le bilan annonce exactement l’XP gagnée (+40, réel +40) », « récompense entière la 1re fois (+30), réduite ensuite (+10) » |
| Sauvegarde automatique, actualisation | e2e, audit, validation : « tout est retrouvé après rechargement » ; robustesse : « enregistrée à la mise en arrière-plan » |
| Import / export | audit : « XP, chapitres et révisions restaurés à l’identique » ; robustesse : import piégé |
| Deux onglets | robustesse : « un enregistrement du premier ne fait plus perdre les 500 XP » |
| Service worker : installation, cache, réseau coupé | horsligne (13 vérifications) ; validation : « s’ouvre depuis le cache » |
| Retour du réseau | validation : « la page reçoit la version publiée en ligne » |
| Mise à jour du cache | validation : « nouvelle version installée, ancienne supprimée » ; « hors ligne après mise à jour : c’est la nouvelle version qui s’ouvre » |
| Fichier autonome sans serveur ni réseau | validation : JS et CSS intégrés, 6/6 bruitages lisibles, 20 images toutes intégrées, quête jouable, aucune requête réseau hors polices Google, aucune erreur |
| Ordinateur (souris, clavier) | validation : 14 écrans sans défilement horizontal en 1366×768, Entrée valide puis passe à la suite, Échap ferme une fiche, aucune erreur |

## 4. Anomalies traitées pendant cette validation

| # | Anomalie | Fichier | Gravité | Cause | Correction | Vérification |
|---|---|---|---|---|---|---|
| 1 | Le constructeur du fichier autonome ne contrôlait que les images : un script, un style ou un son oublié serait passé inaperçu | `outils/fichier_unique.py` | Moyenne | Contrôle incomplet | Refuse d’écrire le fichier si une balise appelle encore une ressource locale, ou si un son manque | Image fictive ajoutée : refus « Ressources locales non intégrées : img/oubli.png » ; build normal : OK, fichier identique à l’octet près |
| 2 | Scénarios de la demande sans aucun test (micro refusé, micro serveur, pistes, double validation, XP exacte, fichier sans réseau, retour réseau, mise à jour du cache, ordinateur) | `tests/validation.cjs` | Moyenne (risque non couvert) | Tests absents | Nouvelle suite de 33 vérifications | 33/33 |
| 3 | Mesures de performance impossibles à rejouer | `tests/perf.cjs` | Faible | Script absent du projet | Script CDP ajouté (`npm run perf`) | Voir section 5 |
| 4 | Playwright non déclaré dans le projet | `package.json` | Faible | Dépendance implicite | `devDependencies` : playwright 1.63.0 ; scripts `test:navigateur`, `perf`, `build` | `npm install` puis toutes les suites OK |
| 5 | **Ordinateur : « Entrée passe à la suite » ne marchait pas** (ajouté lors de l’audit précédent, jamais testé au clavier réel) | `js/play.js` (`bindCard`, `resolveItem`) | Moyenne | Après validation, le champ est désactivé et ne reçoit plus les touches. Premier correctif : une seule Entrée validait ET passait à la suite, la correction n’était jamais vue (la touche activait aussi le bouton qui venait de recevoir le focus) | Le bouton « Continuer » reçoit le focus après une validation au clavier, et la touche qui valide est consommée (`preventDefault`) | validation : « Entrée valide la réponse tapée (correction affichée), puis Entrée passe à la suite (2/7 → 3/7) ». Sans correctif : « 1/7 → 1/7 », échec |

### Échec rencontré puis expliqué

**Ce qui s’est passé :** le test « mise à jour du cache » a d’abord échoué. La nouvelle version du service worker restait « installing » et l’ancien cache n’était pas supprimé.

**Investigation :**
- Un script séparé montrait la mise à jour fonctionnelle : ancien cache supprimé, 53 fichiers dans le nouveau.
- Le journal du serveur montrait que l’installation n’envoyait aucune requête.
- J’ai isolé les différences une par une : mode hors ligne, navigateur neuf, puis manière d’attendre.

**Cause :** le test interrogeait `caches.keys()` à chaque image affichée (`waitForFunction`), ce qui bloquait les écritures du service worker dans Chromium. C’est un artefact du test, pas un défaut de l’appli : l’appli n’interroge jamais le cache ainsi.

**Correction :** une interrogation toutes les 500 ms. L’assertion est inchangée et passe.

### Essai annulé, faute de preuve

Le chargement non bloquant des polices Google a été essayé, puis retiré : aucun gain mesurable ici (3 mesures avant / 3 après, toutes entre 2,50 et 2,55 s).
Les polices Google sont bloquées dans cet environnement : je ne peux pas prouver un gain.

## 5. Performances (Chromium + CDP, mesurées, journaux 12 et 13)

| Mesure | Serveur local sans compression | Serveur gzip (comme GitHub Pages) |
|---|---|---|
| Écran titre visible, 4G lente (1,6 Mbit/s, 150 ms), processeur ×4 plus lent, cache vide | 4 346 ms | 2 493 ms |
| Premier rendu (FCP) | 3 492 ms | 1 612 ms |
| Données transférées | 578 Ko | 269 Ko |

**Sur 180 changements d’écran et 15 quêtes (jouées jusqu’au bilan : 15/15) :**
- Changement d’écran (mesuré jusqu’à l’affichage, sur 180 changements) : moyenne 30,5 ms, médiane 30,8 ms, maximum 46,8 ms.
- Mémoire JS après ramasse-miettes : 2,59 → 3,45 Mo.
- Nœuds DOM : 459 → 579. L’écran mesuré ensuite est l’accueil, plus chargé après progression ; ce n’est pas une fuite.
- Écouteurs d’événements : 39 → 40.
- Écouteurs globaux (window, document, #app, #play) identiques, aucun doublon. La seule évolution est `#play:click` 0→1 : le gestionnaire unique de l’écran de jeu, posé au premier lancement.
- Documents : 1 → 2, stable à 2 sur 6 tours successifs (2, 2, 2, 2, 2, 2) : document interne de Chromium, pas une fuite.
- Erreurs JavaScript : aucune.

**Limite :** le site réel n’a pas pu être mesuré, car l’accès à github.io est bloqué depuis cet environnement. La colonne gzip simule sa compression.

## 6. Contrôle final

**Sécurité des données**
- Aucune clé ElevenLabs dans le projet (vérifié par recherche) : elle reste dans les secrets Cloudflare.
- Le code du serveur voix n’est jamais exporté.
- Un import ne peut pas l’associer à une autre adresse (test).
- Les textes affichés passent par l’échappement HTML.

**Perte de progression**
- Enregistrement après chaque réponse et à la mise en arrière-plan.
- Données illisibles mises de côté, jamais écrasées.
- Deux onglets gérés.
- Stockage plein : seul le détail ancien est allégé (test unitaire).

**Appels réseau**
- Polices Google.
- Serveur voix, seulement s’il est configuré.
- Rien d’autre (vérifié dans le fichier autonome avec le réseau entièrement bloqué).

**Micro** : demandé uniquement à l’appui sur le bouton micro, et libéré après chaque essai (pistes arrêtées, test).

**Erreurs JavaScript** : chaque suite échoue s’il y en a une ; aucune relevée.

## 7. Compatibilité : ce qui est testé, et ce qui ne l’est pas

| Plateforme | Statut |
|---|---|
| Chromium 153 en émulation téléphone (390×844, tactile) | **Testé** (émulation, pas un appareil) |
| Chromium en taille ordinateur (1366×768, souris, clavier) | **Testé** (validation, section 7) |
| iPhone / Safari (WebKit) | **Non testé** : WebKit n’est pas disponible dans cet environnement, et aucun appareil physique |
| Android réel, Firefox, Edge | **Non testés** |

Les voix réelles, l’accent, le mode silencieux de l’iPhone et la reconnaissance vocale réelle sont simulés dans les tests ; ils restent à vérifier sur appareil.

## 8. Anomalies et limites restantes

1. **Safari / iPhone non vérifiés en vrai.**
   - Points à tester à la main : son en mode silencieux, micro, reprise après verrouillage, installation sur l’écran d’accueil.
2. **Premier chargement lent sur réseau faible (environ 2,5 s simulés en 4G lente).**
   - Le poids vient surtout des données de cours (`data/codex.js` 63 Ko compressés, etc.) et de l’image titre (119 Ko).
   - Le chargement suivant passe par le cache.
   - Une optimisation possible serait de charger les données à la demande ; ce serait un changement d’architecture, non fait sans ton accord.
3. **Bouton « retour » d’Android pendant une partie :** il change l’écran du dessous, la partie reste affichée (pas de perte de données).
4. **La reconnaissance vocale vérifie les mots compris, pas l’accent.**

## 9. État final des fonctionnalités

| Fonctionnalité | Statut |
|---|---|
| Quêtes, exercices, corrections, bilan | VALIDÉ (Chromium) |
| XP, niveaux, récompenses sans doublon | VALIDÉ (Chromium) |
| Boss, Tour des examens, tests TOEIC chronométrés | VALIDÉ (Chromium) |
| Sauvegarde, rechargement, données abîmées, deux onglets, import/export | VALIDÉ (Chromium) |
| Hors connexion, retour du réseau, mise à jour du cache | VALIDÉ (Chromium) |
| Fichier autonome sans serveur | VALIDÉ (Chromium) |
| Bruitages | VALIDÉ (Chromium) |
| Voix (navigateur et serveur, interruptions, délais) | PARTIELLEMENT VALIDÉ (voix simulée ; pas d’appareil réel) |
| Micro (refus, arrêt auto/manuel, pistes, nouvel essai) | PARTIELLEMENT VALIDÉ (micro simulé ; pas d’appareil réel) |
| iPhone / Safari, Android, Firefox, Edge | NON TESTABLE DANS L’ENVIRONNEMENT DISPONIBLE |

## 10. Rejouer les tests

```
cd lingua-quest
npm install
npm test
python3 -m http.server 8765 &
npm run test:navigateur
node tests/son.cjs "$PWD/lingua-quest-complet.html"
BASE="file://$PWD/lingua-quest-complet.html" node tests/audit.cjs
BASE="file://$PWD/lingua-quest-complet.html" node tests/robustesse.cjs
npm run perf
npm run build
```
