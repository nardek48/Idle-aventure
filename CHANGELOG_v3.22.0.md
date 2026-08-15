# Aethervale — CHANGELOG v3.22.0

Base : v3.21.0. Deux ajustements sur l'écran de choix des héros livré
juste avant.

## 1. Ordre des étapes inversé

Le nom vient maintenant **en premier** ("Votre légende commence"), suivi
du choix du héros ("Choisissez votre héros"). Le bouton de l'étape nom
s'appelle maintenant "CONTINUER" (au lieu de "VALIDER LE NOM", qui
n'avait plus de sens n'étant plus l'étape finale) ; "CONFIRMER LE HÉROS"
reste le bouton final, à la toute dernière étape.

Le bouton "‹ Retour" est passé de l'étape nom à l'étape héros (toujours
présent entre les deux, juste sur l'autre écran maintenant) — le nom
saisi est conservé si on revient en arrière puis qu'on avance à nouveau.

## 2. Les 6 héros affichés (au lieu de 3)

Chevalier/Rôdeur/Mage ET les 3 variantes du Chaos sont maintenant tous
sélectionnables dès la création du personnage — la grille passe
naturellement à 2 rangées de 3 (aucun changement CSS nécessaire, le
grid à 3 colonnes gère déjà le retour à la ligne automatiquement).
Sélectionner une variante du Chaos ici déclenche bien `codexChaosSeen`,
comme avant.

## Détail technique

`js/ui/modal-view.js` :
- `heroSelectionStep` démarre maintenant à `"name"` (était `"hero"`).
- Nouvelle variable `pendingPlayerName` — le nom est lu et VALIDÉ dès
  l'étape 1 (`goToHeroStep()`, remplace `goToNameStep()`), puis gardé en
  mémoire jusqu'à la confirmation finale (`confirmHeroSelection()` lit
  maintenant `pendingPlayerName` au lieu du DOM, puisque le champ de
  saisie n'existe plus une fois passé à l'étape héros).
- `backToNameStep()` remplace `backToHeroStep()` — direction inversée
  en cohérence avec le nouvel ordre.
- `HERO_SELECTION_BASE_IDS` étendue aux 6 héros (était limitée aux 3
  classes de base).

## Tests effectués

- `node --check` sur le fichier touché.
- Re-passage des 9 harnais de non-régression existants : aucune
  régression.
- Playwright (rendu réel, 390×844, contexte navigateur vierge) : flux
  complet — nom "Morgane" saisi en premier → "CONTINUER" → écran héros
  avec 6 cartes confirmées → sélection de "Sorcier du Chaos" (portrait/
  stats mis à jour) → "‹ Retour" → nom "Morgane" bien restauré dans le
  champ → "CONTINUER" à nouveau → "CONFIRMER LE HÉROS" → `game.heroId
  === "chaosMage"`, `game.playerName === "Morgane"`, `game.codexChaosSeen
  === true`, overlay bien fermé. Aucune erreur console, aucun 404.

## Fichiers modifiés

- `js/ui/modal-view.js`
- `sw.js` (`CACHE_VERSION` → `"3.22.0"`)
