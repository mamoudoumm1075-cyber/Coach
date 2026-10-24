# Serveur voix ElevenLabs : mise en place

Le serveur est un petit programme Cloudflare (gratuit) qui garde ta clé ElevenLabs. L’appli lui envoie une phrase, il demande la voix à ElevenLabs et renvoie l’audio. Ta clé n’est jamais dans l’appli ni sur GitHub.

Durée : 15 minutes environ.

## 1. Clé ElevenLabs

1. Va sur elevenlabs.io, connecte-toi.
2. Menu **Developers** → **API Keys** → **Create API Key**.
3. Nom : `lingua-quest`.
4. Permissions : laisse **Text to Speech** et **Speech to Text** sur « Access », mets le reste sur « No access ».
5. Si l’option de limite de crédits existe, mets un plafond mensuel (par exemple la moitié de ton forfait).
6. Copie la clé (elle commence par `sk_`). Garde-la dans tes notes : ElevenLabs ne la montre qu’une fois.

## 2. Créer le Worker Cloudflare

1. Crée un compte gratuit sur dash.cloudflare.com.
2. Menu **Workers & Pages** → **Create** → **Create Worker** (modèle « Hello World »).
3. Nom : `lingua-quest-voix` → **Deploy**.
4. Clique **Edit code**. Efface tout le code affiché.
5. Colle le contenu du fichier `lingua-quest/serveur/worker.js` (bouton « Copy raw file » sur GitHub).
6. **Deploy**.

## 3. Les deux secrets

Dans le Worker : **Settings** → **Variables and Secrets** → **Add**.

| Type | Nom | Valeur |
|---|---|---|
| Secret | `ELEVENLABS_API_KEY` | la clé `sk_…` de l’étape 1 |
| Secret | `ACCESS_CODE` | un code que tu inventes, long (exemple : quatre mots sans espaces) |

Clique **Deploy** pour enregistrer.

## 4. Le plafond par jour (recommandé)

1. Menu **Storage & Databases** → **KV** → **Create** → nom `lingua-quest-compteurs`.
2. Retourne dans le Worker → **Settings** → **Bindings** → **Add** → **KV namespace**.
3. Variable name : `LQ_KV`. Namespace : `lingua-quest-compteurs`. **Deploy**.

Par défaut : 4000 caractères de voix et 80 transcriptions du micro par jour. Pour changer, ajoute dans « Variables and Secrets » des variables de type Text `DAILY_CHARS` ou `DAILY_STT`.

Les phrases déjà entendues sont gardées en mémoire (par Cloudflare et par ton téléphone) : les réécouter ne coûte rien.

## 5. Brancher l’appli

1. Copie l’adresse du Worker, affichée en haut de sa page : `https://lingua-quest-voix.<ton-nom>.workers.dev`.
2. Dans Lingua Quest : **Héros** → **Profil et paramètres** → carte **Voix ElevenLabs**.
3. Colle l’adresse, tape ton code secret → **Tester et enregistrer**.
4. Le message « Connecté » s’affiche. Clique **Écouter une phrase** pour vérifier.

## Si ça ne marche pas

| Message | Cause |
|---|---|
| Code secret refusé | Le code tapé n’est pas identique à `ACCESS_CODE`. |
| Le serveur n’a pas ses secrets | Un des deux secrets manque, ou le Worker n’a pas été redéployé. |
| ElevenLabs a refusé la demande | Clé incorrecte, permission manquante, ou plus de crédits. |
| Serveur injoignable | Adresse mal copiée, ou pas d’internet. |

Dans tous les cas, l’appli continue avec la voix du navigateur : rien ne bloque.
