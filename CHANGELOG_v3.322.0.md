# Aethervale v3.322.0 — L'Offrande et la Mémoire remplacent l'Ascension

Référence : **Aethervale_Conception_Offrande_v1_2**. Lots O-1 à O-4, codés d'un bloc sur accord de Seb (fichiers protégés compris).

## O-1 — L'Offrande à la place de la vente
- **Offrir** remplace Vendre dans le sac. Le bouton affiche l'Aether rendu, ou « aucun souvenir ».
- **Tout offrir** remplace Tout vendre, et l'**auto-offrande** remplace l'autovente (même réglage, même seuil). Une arme d'élite ne part jamais.
- **Sac à 25 places** (50 avec le Sac profond). « /50 » n'est plus écrit en dur.
- **Sac plein** : l'objet est offert au lieu d'être perdu. Un objet unique entre en dépassement.
- **Achat en échoppe** : marqueur `fromShop`, donc Offrande à 0.
- **Achat avec le sac plein : refusé.** Sinon l'objet aurait été offert avant d'être payé.

## O-2 — Le niveau de Mémoire
- **Nouveaux fichiers** `js/data/memory.js` et `js/systems/memory-system.js`, déclarés dans `index.html` et dans le précache de `sw.js`. **À mettre en ligne.**
- **Deux compteurs :**
  - la jauge est `game.totalAetherEarned`, qui ne se vide jamais ;
  - `game.aether` est le solde, qui ne sert plus qu'aux reprises.
- **Coûts des niveaux** : 5 / 8 / 11 / 14 en Forêt, 20 / 25 / 30 / 35 au Désert. Plafond de 4 niveaux par monde atteint.
- **Souvenirs** : étape d'Histoire +1, boss d'aventure +2, élite +3 (d'aventure et de carte, à chaque victoire), run de donjon complet +3.
- **Choix** gratuit ; **reprise** 10 Aether, ×3 à chaque fois.
- **Écran de Mémoire** à la place de l'écran d'Ascension (même onglet). Le bouton du Héros devient « Mémoire ».
- **Mini-tutoriel** à la première ouverture après le niveau 1, et une **ligne du Veilleur** à la première Offrande.
- **Sauvegarde** : `game.memory` est branché dans `buildSaveData`, au chargement, dans `hardResetState` (gardé) et dans `fullResetState` (remis à zéro).
- **Fin de l'Ascension :**
  - `AscensionManager` est neutralisé ;
  - `AETHER_SHOP` est vidé et `getAetherBonuses()` renvoie des zéros ;
  - les bonus par Ascension (+4 % de PV, +6 % de dégâts, +5 % d'or) et le bonus de +0,5 % par Aether cumulé sont retirés.

## O-3 — Les huit niveaux
Tous passent par `MemoryManager.has(id)`.
- **Niveau 1** : Sac profond, Réserve d'alchimiste (`getPotionStockCap`).
- **Niveau 2** : Grimoire étendu (+1 règle active), Repos du camp.
- **Niveau 3** : Fidélité de Wenna, Fiole de réserve (`getSortiePotionCap`).
- **Niveau 4** : Mémoire vive (+25 % sur tout l'Aether, fractions reportées), Écho de la faille (+50 % d'Éclats en fin de run), Récolte.
- **Niveau 5** : Seconde gorgée, Outre de cuir.
- **Niveau 6** : Œil du marchand, Étal garni.
- **Niveau 7** : Fidélité de Maddoc, Voie libre (un changement gratuit par jour, hors multiplicateur).
- **Niveau 8** : Main du forgeron, Chitine fendue, Regard du marchand.

## O-4 — Dépendances
- **Élixir d'Aether** retiré. Un vieux stock est ignoré, sans erreur.
- **Talent « Main offrante »** (ex-Rituel opulent) : 10 % par rang qu'un objet offert rende l'Aether d'une rareté au-dessus.
- **Hauts faits** : ils suivent les niveaux de Mémoire 1, 4 et 8 (identifiants gardés).
- **Codex** : l'entrée « La Mémoire et la promesse de l'Aether » est réécrite et débloquée au niveau 1. L'épilogue suit la même condition. Les textes des Sceaux 2 et 3 ne parlent plus d'Ascensions.
- **Héros › Stats** : l'Ascension et l'Aether ne sont plus des sources.

## Mesures
- **Harnais** : 0 échec sur 5 passages (3 002 à 3 004 OK, [85] sautée). Nouvelle section **[118]**. Tests mis à jour : [76], Bilan, Stats et autovente.
- **Autres harnais** : boot 4 OK, création de héros 44 OK.
- **`sim/offrande-bench.js`** (nouveau) : le niveau 8 demande environ 18 victoires répétées au Désert (14 runs de la Cité, ou 27 victoires sur le Dard).
- **`sim/cite-vague5-bench.js --memoire=...`** (nouvelle option), sphinx au profil d'après-palier :
  - sans Mémoire : Chevalier 67 %, Rôdeur 98 %, Mage 100 % ;
  - avec la Fiole de réserve : **Chevalier 92 %**, les autres à 100 % ;
  - les Fidélités n'ont pas d'effet mesurable.

## Icônes à générer
`images/Icons/memory/<id>.png` pour les 18 options (icône générique en attendant). Liste complète : `node sim/missing-icons.js .`
