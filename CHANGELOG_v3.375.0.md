# Aethervale v3.375.0 — EN-1 : l'interface en anglais

Base : v3.374.0.

- **L'interface est traduite en anglais** : 1 647 textes (menus, boutons, messages, toasts, journal, confirmations, écrans de Héros, Village, Production, Équipement, Quêtes, Combat, Donjons, Grimoire, Hauts faits, Paramètres…).
- **Le choix de langue apparaît dans les Paramètres** (D3) : carte « Langue · Language » avec les boutons **Français** et **English (beta)**, et une confirmation avant de relancer le jeu (D2).
  - Un texte prévient que l'histoire et les textes du monde restent en français pour l'instant.
  - La pseudo-langue de test reste réservée à l'Admin.
- **En français**, rien ne change à l'écran, sauf la nouvelle carte « Langue » en bas des Paramètres. Les 39 captures avant/après sont identiques, hors valeurs qui bougent avec le temps.
- Aucun fichier nouveau dans le jeu. Un fichier nouveau hors jeu : `sim/i18n-glossaire-en.md`.
- Aucun fichier protégé touché.
- Rien de neuf dans la sauvegarde.

## 1. Le glossaire — `sim/i18n-glossaire-en.md`

Fixé par Claude (accord de Seb du 28/09/2026). Il servira aussi à la traduction des données, monde par monde.

**Noms gardés tels quels** : les personnages et le village (Aethervale, Aeswyn, Brannoc, Orwen, Wenna, Sarkel, Aldric, Maddoc, Nezzam), et l'Aether.

**Tout le reste est traduit, pour qu'on comprenne à quoi ça sert.** Exemples :

| Français | Anglais |
| --- | --- |
| le Veilleur | the Watcher |
| la Lisière | the Forest Edge |
| le Recouvrement | the Reclaiming |
| l'Ensablement | the Sandfall |
| Palissade | Palisade |
| Mémoire | Memory |
| Offrande | Offering |
| Souvenir | Keepsake |
| Sève | Sap |
| Éclats | Shards |
| Marques | Marks |
| Hauts faits | Feats |
| fil rouge | Next step |
| Petite Aventure | Short Adventure |
| télégraphe | tell |

**Caractéristiques** :

| Français | Anglais |
| --- | --- |
| Force | Strength |
| Endurance | Endurance |
| Célérité | Celerity |
| Précision | Precision |
| Volonté | Willpower |
| PV | HP |
| VIT | SPD |

**Anglais britannique** (« armour », « defence »), tutoiement rendu par « you », ton sobre et direct comme en français.

## 2. Ce que voit un joueur anglophone aujourd'hui

- **Toute l'interface en anglais.**
- **En français pour l'instant**, parce que ce sont des données, à traduire monde par monde : l'Histoire, le Codex, les noms d'ennemis, d'objets, de lieux, de bâtiments et de ressources, les tutoriels, les descriptions des talents.
- **Mélange passager** : quand un mot existe à la fois dans l'interface et dans les données (« Bois », « Pierre », « Chasse »…), il est déjà en anglais à certains endroits (Wood, Stone) et pas à d'autres (Viande, Blé). Cela disparaîtra avec la traduction des données.

## 3. Corrections

- **Donjons** : le titre de page avait encore le chemin de l'icône dans la clé de traduction (`_t("images/…|Donjon")`). C'est corrigé comme pour les autres titres.
- **Lexique de test** : l'entrée de la barre d'onglets « Héros » passe de « Heroes » à « Hero ».

## 4. Outils

`sim/i18n-audit.js` accepte l'option `--json out.json`. Elle sort tous les textes relevés (clé, sorte, fichiers, traduit ou non), pour préparer une traduction par blocs.

## 5. Harnais

**round-harness.js**, section **[151]** :
- l'audit tourne avec 0 orphelin, 0 `{paramètre}` différent et 0 appel non littéral ;
- **aucun texte d'interface ne manque en anglais**, outils de développement exceptés ;
- en anglais, les textes simples, les pluriels (« 1 item », « 3 items »), les gabarits et les Paramètres sont traduits, et le choix de langue est présent ;
- en français, la carte de langue est présente, avec son bouton de confirmation.

## 6. Mesures

```
node sim/i18n-audit.js .
i18n — dictionnaire « en » : 1647 entrée(s)
Textes traduisibles relevés : 3438 — traduits : 1647 (48 %), manquants : 1791 (= les données)
Orphelins : 0 · {paramètres} différents : 0 · Appels non littéraux : 0
```

## 7. Contrôles

| Contrôle | Résultat |
| --- | --- |
| round-harness.js ([85] neutralisée) | 3 564 à 3 566 OK, 0 échec |
| boot-harness.js · hero-creation-harness.js | 4 OK · 44 OK |
| parcours-harness.js, P1 à P12 | 125 OK, 0 échec |
| campagne-harness.js (Chevalier) | 38 / 38 |
| Captures téléphone, français, avant/après (39 écrans) | identiques, sauf la barre de défilement des Paramètres (page plus longue) |
| Captures téléphone en anglais (35 écrans relus) | aucun débordement de texte |

## 8. Fichiers

- **Nouveau (hors jeu, ni `index.html` ni précache)** : `sim/i18n-glossaire-en.md`.
- **Modifiés** :
  - `js/lang/en.js` (le dictionnaire) ;
  - `js/ui/settings-view.js`, `css/04-panel-settings.css` (carte « Langue ») ;
  - `js/ui/dungeon-view.js` ;
  - `js/core/constants.js`, `sw.js` (3.375.0) ;
  - `round-harness.js`, `sim/i18n-audit.js`.

## 9. Suite

Traduction des **données, monde par monde**, en commençant par la Forêt : Histoire du chapitre 1, Codex, quêtes de village, ennemis, objets, bâtiments, ressources, carte vivante. Une fois la Forêt en anglais, le jeu pourra démarrer dans la langue du navigateur (D3).
