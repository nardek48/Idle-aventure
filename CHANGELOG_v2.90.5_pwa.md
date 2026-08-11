# CHANGELOG — v2.90.5 (PWA — première version)

## Résumé
Quest Idle devient installable comme app (Android/Chrome : bouton
"Installer" natif ; iOS/Safari : "Partager -> Sur l'écran d'accueil"
manuel) et fonctionne hors-ligne après un premier chargement en ligne.
**La version navigateur classique continue de fonctionner à
l'identique** — rien n'est retiré, tout est additif.

## Nouveaux fichiers

### `manifest.json` (racine)
Nom, icônes, couleur de thème (`#0d0a1a`, reprend le
`<meta name="theme-color">` déjà en place), `display: standalone`,
`orientation: portrait`.

### `sw.js` (racine — Service Worker)
Stratégie en 2 niveaux :
- **App shell** (tous les `.js`/`.css` + `index.html` + `manifest.json`
  + les 4 icônes — 93 fichiers, ~900 Ko) : précaché explicitement à
  l'installation (`PRECACHE_APP_SHELL`, liste générée automatiquement
  à partir du contenu réel du disque, vérifiée fichier par fichier).
- **Runtime** (tout le reste en même origine, concrètement `images/`
  — ~80 Mo) : PAS précaché d'un coup (trop lourd/inutile au premier
  lancement) — chaque image est mise en cache à la volée la première
  fois qu'elle est réellement demandée par le jeu.
- **Versioning** : `CACHE_VERSION = "2.90.4"` en haut du fichier — **à
  incrémenter à CHAQUE livraison** (voir section dédiée plus bas).
  À l'activation, tous les caches d'une version précédente sont
  supprimés (app shell ET runtime confondus) — ça élimine tout risque
  de servir une vieille image en cache sous un nom de fichier réutilisé,
  au prix de quelques Mo retéléchargés par mise à jour au fil de la
  navigation du joueur.
- **Mise à jour immédiate** (décision explicite) : `skipWaiting()` +
  `clients.claim()` font basculer une partie déjà ouverte vers la
  nouvelle version dès qu'elle est prête, sans attendre la fermeture
  des onglets. Le service worker prévient alors la page via
  `postMessage` pour afficher la bannière de rechargement (voir plus
  bas) plutôt que de changer le code sous les pieds du joueur sans
  prévenir.

### `js/main/pwa.js`
Enregistrement du service worker (`navigator.serviceWorker.register`),
protégé par `if ('serviceWorker' in navigator)` — sur un navigateur
qui ne supporte pas les service workers, ce fichier ne fait
strictement rien, le jeu continue de fonctionner normalement en page
web classique. Écoute aussi le message `QUEST_IDLE_SW_UPDATED` envoyé
par `sw.js` pour afficher la bannière "Nouvelle version disponible".
Auto-démarré à la fin du fichier, indépendant de `init()` du jeu
(`main/boot.js` non modifié).

### `images/icons/` (4 fichiers)
Icônes générées (thème or/parchemin du jeu, blason + "Q") en
attendant un logo définitif :
- `icon-192.png`, `icon-512.png` (usage standard)
- `icon-512-maskable.png` (fond plein bord à bord + contenu dans la
  zone de sécurité centrale, requis par Android pour l'icône
  adaptative)
- `apple-touch-icon.png` (180×180, icône iOS)

## Fichiers modifiés

### `index.html`
- `<link rel="manifest">`, `<link rel="apple-touch-icon">`,
  `<link rel="icon">`, `<meta name="apple-mobile-web-app-title">`
  ajoutés dans le `<head>`.
- Nouvelle bannière `#pwa-update-banner` (masquée par défaut) juste
  après `#toast`.
- `<script src="js/main/pwa.js">` ajouté juste avant `boot.js`.

### `css/05-overlays.css`
Styles de `#pwa-update-banner` (bandeau doré en haut d'écran, reste
affiché tant que le joueur n'a pas cliqué "Recharger" — contrairement
à `#toast` qui disparaît tout seul après 2s).

## Tests effectués
- `manifest.json` : JSON valide.
- `sw.js`/`js/main/pwa.js` : `node --check` OK.
- `PRECACHE_APP_SHELL` vérifié dans les deux sens : les 93 fichiers
  listés existent tous réellement sur disque, ET aucun fichier
  `.js`/`.css` réel du projet n'a été oublié dans la liste.
- **Test fonctionnel réel** (serveur HTTP local + Playwright,
  Chromium) :
  - Service worker enregistré et actif (`state: "activated"`).
  - `navigator.serviceWorker.controller` bien présent après un
    premier rechargement.
  - Cache `quest-idle-2.90.4` créé, 120 entrées après un premier
    passage sur l'écran de création de personnage (93 app shell + 27
    images déjà rencontrées).
  - **Mode hors-ligne réel testé** (`context.set_offline(True)` +
    rechargement complet) : le jeu se charge intégralement, HUD et
    images comprises — capture d'écran envoyée dans le chat.

## À faire côté hébergement (aucune action de ma part possible ici)
- Déployer sur GitHub Pages (ou équivalent HTTPS) — le service worker
  ne fonctionne PAS en `http://` simple (uniquement HTTPS, ou
  `localhost`/`127.0.0.1` pour les tests, comme fait ci-dessus).
- **À CHAQUE livraison future** : penser à incrémenter
  `CACHE_VERSION` en haut de `sw.js` (proposition : le faire
  correspondre à ton numéro de version du jeu). Sans ça, les joueurs
  resteront bloqués sur les fichiers de l'ancienne version en cache.

## Pas encore fait (hors périmètre de cette itération, "essai" demandé)
- Pas de véritable écran de logo/blason dédié — icônes génériques en
  attendant.
- Pas de bouton "Installer" personnalisé dans l'UI (le prompt
  d'installation natif du navigateur suffit pour un premier essai).
- Pas de test réel sur iOS Safari (comportement PWA différent,
  installation manuelle) — seul Chromium/Playwright a pu être testé
  dans ce sandbox.
