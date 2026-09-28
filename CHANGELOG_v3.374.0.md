# Aethervale v3.374.0 — Multilangue, lot L-6 (registre des textes des données)

Base : v3.373.0.

- **En français, rien ne change à l'écran.** Les 39 écrans comparés au téléphone avant/après sont identiques au pixel près. Les seules différences viennent du temps qui passe : combat en direct, toast encore visible, anneau animé, chronomètre du Journal.
- **Deux fichiers nouveaux**, aucun n'est chargé par le jeu. Rien à ajouter dans `index.html` ni dans le précache de `sw.js` :
  - `js/lang/data-fields.js` : le registre ;
  - `sim/i18n-data.js` : l'outil qui le lit, hors jeu.
- Aucun fichier protégé touché.
- Rien de neuf dans la sauvegarde. Les données restent en français (noms d'objets, trophées, titres portés) : seule la lecture change de langue.

## 1. Le registre — `js/lang/data-fields.js`

**2 144 textes de données déclarés, dans 65 tables.** Cela représente environ 1 800 textes distincts et 15 000 mots.

```js
DATA_TEXT_FIELDS = {
  STORY_QUESTS: ["*.title", "*.steps.*.title", "*.steps.*.narrative.dialogue.*.text", …],
  ENEMY_DB: ["*.name", "*.lore"],
  COMPANIONS_DB: ["*.name", "*.lines", "*.voies.*.label", …],
  …
}
```

Règles de lecture d'un chemin :
- « `*` » veut dire n'importe quelle clé ;
- « `**` » veut dire n'importe quelle profondeur ;
- un chemin qui aboutit à une liste ou à un objet couvre toutes les chaînes qu'il contient (répliques, noms de zones, journal par profondeur…).

Trois tables vivent hors de `js/data/` et sont déclarées aussi (`DATA_TEXT_SOURCES`) :
- `GENERIC_TUTORIALS` (les fenêtres « Compris ») ;
- les mots par défaut de la carte vivante ;
- les anciennes améliorations remboursées.

Quelques chaînes françaises des données ne sont pas du texte affiché : les chiffres romains d'acte, les chemins techniques des talents, et les gabarits déjà passés par `_t()`. Elles sont listées dans `DATA_TEXT_IGNORED`.

**La règle pour la suite** (Monde 3) : un texte nouveau dans les données va dans un champ déjà déclaré (`name`, `desc`, `title`, `text`…). Un champ nouveau s'ajoute au registre. Si on l'oublie, le harnais le signale.

## 2. Affichage

Les vues passaient déjà les données par `_td()` (lots L-1 à L-5). Ce lot a vérifié les écrans à l'écran, en pseudo-langue, et corrigé ce qui restait :
- **Entrepôt** : la description d'une ressource ;
- **Compagnons** : le rôle (« Soutien ») et le prix de l'entraînement ;
- **Récits de patrouille** : le texte est maintenant traduit **avant** que le nom du secteur soit substitué, sinon la traduction n'aurait jamais été trouvée ;
- **Village** : la carte de l'Atelier retirait « Objectif : » par une expression régulière sur le français, qui ne marcherait plus en anglais. Une fonction `WorkshopUnlockManager.getBannerStepText()` rend le texte sans ce préfixe. En français, l'affichage est identique ;
- **Fenêtres de fin de quête** : « Quête terminée ! », « Or », « Objet unique », « Sève d'Aeswyn », « Continuer » passent par `_t()` à la source ;
- **Boutique** : aperçus Précision et Volonté ;
- **Inventaire** : « Auto-offrande activée / désactivée » ;
- **Production** : « +{n}/min ».

## 3. Outils (hors jeu)

- **`sim/i18n-data.js`** (nouveau) :
  - charge les données comme le jeu ;
  - déroule les chemins du registre ;
  - liste les chaînes françaises qu'aucun chemin ne couvre.
- **`sim/i18n-audit.js`** : il compte maintenant les textes des données. Le squelette `--skeleton` les inclut, prêts pour EN-1.
- **`sim/i18n-pseudo-scan.js`** : 20 écrans de plus, avec du contenu (sac rempli, créature rencontrée, Mémoire, compagnon) :
  - Village, Production, Entrepôt, Équipement, Inventaire, Échoppe, Potions ;
  - Héros, Stats, Capacités, Talents, Compagnons ;
  - Grimoire, Hauts faits, Bestiaire, Codex, Tutoriels, Journal, Mémoire, Donjons.

## 4. Harnais

**round-harness.js**, section **[150]** :
- les 65 tables déclarées existent ;
- chaque chemin trouve au moins un texte. Seule exception : `ENEMY_DB *.lore`, prévu mais pas encore rempli ;
- aucun identifiant ni chemin d'image n'est déclaré comme texte ;
- **aucune chaîne française des données n'est hors registre** : c'est le garde-fou de la règle ;
- en pseudo-langue, la donnée est traduite à l'affichage et reste en français dans l'objet ;
- les mots de la carte et les récits de patrouille sont traduits, et le récit en français est inchangé.

## 5. Mesures

```
node sim/i18n-audit.js .
Données : 1791 texte(s) déclaré(s) au registre, 0 chaîne(s) française(s) hors registre
Textes traduisibles relevés : 3436 (39 pluriels) — manquants : 3431
Orphelins : 0 · {paramètres} différents : 0 · Appels non littéraux : 0
Texte français encore en dur (estimation) : ~151 dans 32 fichier(s)
```

Le reste « en dur » se répartit ainsi :
- **~100** dans les outils de développement (Admin, simulateur de rounds, debug tactile), laissés en français volontairement ;
- **le reste** : des faux positifs de l'estimation, sur des gabarits `_t()` écrits sur plusieurs lignes.

En pseudo-langue, sur 33 écrans, les textes « nus » restants sont de trois sortes : le nom du joueur, des phrases traduites qui contiennent du HTML (le relevé les voit en morceaux), et le début des extraits du Codex.

**Volume à traduire (EN-1 et suivants)** :

| Bloc | Textes | Mots |
| --- | --- | --- |
| Interface (code, lots L-1 à L-5) | ~1 600 | ~7 400 |
| Données | ~1 830 | ~15 100 |

Les plus gros blocs de données :
- Histoire : ~5 000 mots ;
- Codex : ~1 300 mots ;
- quêtes de village : ~1 100 mots ;
- talents, tutoriels, nœuds d'expédition, Hauts faits : ~500 mots chacun.

## 6. Contrôles

| Contrôle | Résultat |
| --- | --- |
| round-harness.js ([85] neutralisée) | 3 556 à 3 558 OK, 0 échec |
| boot-harness.js · hero-creation-harness.js | 4 OK · 44 OK |
| parcours-harness.js, P1 à P12 | 125 OK, 0 échec |
| campagne-harness.js (Chevalier) | 38 / 38 |
| Captures téléphone, français, avant/après (39 écrans) | identiques |

## 7. Fichiers

- **Nouveaux (hors jeu, ni `index.html` ni précache)** : `js/lang/data-fields.js`, `sim/i18n-data.js`.
- **Modifiés** :
  - core : `constants.js` (version) ;
  - systems : `adventure-quest-system.js`, `elite-system.js`, `patrol-system.js`, `story-quest-system.js`, `village-quest-system.js`, `workshop-unlock-system.js` ;
  - ui : `companions-view.js`, `equipment-view.js`, `production-view.js`, `shop-view.js`, `village-view.js`, `warehouse-view.js` ;
  - racine : `sw.js` (`CACHE_VERSION` 3.374.0), `round-harness.js` ;
  - sim : `i18n-audit.js`, `i18n-pseudo-scan.js`.

## 8. Suite

L'extraction est terminée (L-0 à L-6). Prochaine étape, **EN-1 : traduire l'interface** (~1 600 textes, ~7 400 mots). Il faut d'abord un **glossaire des noms propres** à valider :
- lieux : Aeswyn, la Lisière… ;
- personnages : Brannoc, Sarkel, Wenna, Maddoc ;
- mécaniques : Recouvrement, Palissade, Offrande, Mémoire, Sève…

Pour chacun, deux choix : garder le mot, ou le traduire.
