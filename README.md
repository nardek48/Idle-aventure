# Aethervale

RPG d'aventure et de gestion, fantasy médiévale, en français, pour mobile. On crée un héros (Chevalier, Rôdeur ou Mage) et on suit l'Histoire d'un monde à l'autre. Pendant ce temps, un village tourne tout seul et produit de quoi équiper le héros.

- **Combat au tour par tour**, en mode Tactique (le joueur choisit chaque action) ou Grimoire (des règles écrites par le joueur jouent à sa place). Le héros combat avec ses compagnons, Wenna et Maddoc.
- **Deux mondes**, la Forêt enchantée et le Désert oublié, avec leurs cartes vivantes, leurs Petites Aventures, leurs élites et leurs donjons.
- **Un village** : bâtiments, zones de production, ateliers, Entrepôt, Forge, Enchanteresse, Apothicaire, Taverne.
- **Progression sans remise à zéro** : arbres de talents par classe, Mémoire nourrie par l'Offrande, Hauts faits.

Public : adultes et adolescents dès 12 ans. HTML, CSS et JavaScript vanilla, sans framework ni dépendance. Le jeu est une PWA : il s'installe comme une application et se joue sans connexion.

**Jouer :** <adresse du jeu à compléter>

## Installer le jeu

- **Chrome, Edge (ordinateur), Android** : un bouton **Installer le jeu** apparaît en haut de l'écran titre, et dans **Menu › Paramètres › Application**.
- **iPhone, iPad** : dans Safari, **Partager**, puis **Sur l'écran d'accueil**. Le bouton **Installer sur iPhone / iPad** du jeu rappelle la marche à suivre.

Une fois installé, le jeu s'ouvre en plein écran. Il demande aussi au navigateur de ne pas effacer la sauvegarde quand la place manque.

La sauvegarde reste dans le navigateur de l'appareil. Pour ne rien perdre, il faut l'exporter de temps en temps : **Paramètres › Sauvegarde › Exporter**.

## Lancer en local

Le service worker exige une adresse `http://`. Ouvrir `game/index.html` par double-clic ne suffit pas, il faut un petit serveur :

```bash
npx serve game              # ou : python3 -m http.server 8000 --directory game
```

Puis ouvrir l'adresse affichée, par exemple http://localhost:3000.

## Organisation du code

Le jeu est dans `game/`, seul dossier publié sur GitHub Pages (workflow `.github/workflows/pages.yml`, après les harnais). Les chemins ci-dessous sont relatifs à `game/`.

| Dossier | Contenu |
| --- | --- |
| `js/core/` | Constantes (dont `GAME_VERSION`), état initial du jeu, outils communs |
| `js/data/` | Données du jeu : quêtes, ennemis, élites, donjons, objets, talents, village… |
| `js/systems/` | Règles du jeu : combat, sauvegarde, progression, quêtes, village, donjons… |
| `js/ui/` | Écrans : chaque fonction `build…HTML()` rend une vue |
| `js/main/` | Démarrage (`boot.js`), boucle de jeu, service worker et installation (`pwa.js`) |
| `css/` | Styles, par écran, sur les jetons de `00-tokens.css` |
| `images/` | Illustrations, portraits, icônes |

Hors jeu, à la racine du dépôt :

| Dossier | Contenu |
| --- | --- |
| `tools/harness/` | Harnais de non-régression |
| `tools/sim/` | Bancs d'équilibrage et robot de campagne |
| `tools/audit/` | Audits : traduction, icônes manquantes, design, captures |
| `tools/docs-gen/` | Générateurs de documents |
| `atelier/` | Maquettes de composants, à juger sur téléphone avant de les mettre dans le jeu |
| `docs/` | Changelogs, glossaire de traduction |
| `captures/` | Sorties des outils, hors git |

Les scripts sont chargés dans l'ordre par `index.html`, sans modules ni bundler. Un fichier expose ce qu'il partage sur `window`.

## Livrer une version

1. Incrémenter **`GAME_VERSION`** dans `js/core/constants.js` et **`CACHE_VERSION`** dans `sw.js`. Sans le second, les joueurs gardent l'ancienne version en cache.
2. **Tout fichier nouveau** (JS, CSS) doit être ajouté à `index.html` **et** à la liste de précache de `sw.js`. Il faut ensuite le mettre en ligne **en même temps** que le `sw.js` qui le cite. Sinon, l'installation du service worker échoue et le jeu reste bloqué sur l'ancienne version.
3. Supprimer un fichier seulement après la mise en ligne d'un `sw.js` qui ne le précache plus.
4. Toute nouvelle donnée à sauvegarder passe par les quatre points de `save-system.js` : `buildSaveData`, le chargement, `hardResetState` et `fullResetState`.
5. Une image manquante garde son vrai chemin et s'affiche avec l'icône générique en attendant.
6. Chaque livraison a son `docs/changelog/CHANGELOG_vX.Y.Z.md`. Le push sur `main` publie le jeu si les harnais passent.

## Tests et bancs

Ils tournent sous Node, sans navigateur, sauf ceux qui sont marqués Chromium. Sans argument, ils visent `game/` ; avec des options, passer la racine d'abord (`.`).

| Outil | Rôle |
| --- | --- |
| `tools/harness/round-harness.js` | Plus de 3 000 contrôles sur les règles du jeu, une section par version. À faire passer avec 0 échec avant chaque livraison |
| `tools/harness/boot-harness.js`, `tools/harness/hero-creation-harness.js` | Démarrage et création de héros |
| `tools/harness/parcours-harness.js` | **Chromium** : le vrai `index.html` à la taille d'un iPhone. Douze parcours de joueur : retour après absence, combat, expédition, mise à jour de version, installation, acte IV du Désert… |
| `tools/sim/campagne-harness.js`, `tools/sim/campagne-lot.js` | Un robot joue toute l'Histoire, avec de vrais combats, et mesure le temps de jeu, les morts et les blocages |
| `tools/sim/retour-demarrage-bench.js` | Écran de retour et chargement des héros |
| `tools/audit/missing-icons.js` | Liste les images citées par le code mais absentes du dossier |
| Autres `tools/sim/*-bench.js` | Bancs d'équilibrage ciblés : un boss, un donjon, une économie… |

```bash
node tools/harness/round-harness.js
node tools/harness/parcours-harness.js             # tous les parcours
node tools/harness/parcours-harness.js . P11       # un seul
node tools/sim/campagne-lot.js . --combats --n 4   # 12 campagnes, environ 12 min
node tools/audit/missing-icons.js
```

Le harnais de parcours demande Playwright : `npm i -D playwright`, puis `npx playwright install chromium`.

## Documentation

Les documents de conception (Histoire, Désert, combat, village, donjons, talents, Offrande, Hauts faits, Évolutions) et l'**État des chantiers** sont tenus à part du code. Le document de conception fait foi sur les décisions ; l'État des chantiers fait foi sur l'état du code, daté par version.
