# Aethervale v3.421.0 — Caravane recalée après la vérification de campagne

Décision de Seb du 01/10/2026 (option B). S'applique sur la v3.420.0.

## Ce qui change
- **La caravane n'emporte plus ni Bois ni Fer**, seulement le Blé, la Viande, l'Eau et la Pierre, c'est-à-dire les ressources en surplus. Le Bois (99 % consommé) et le Fer (84 %) font les planches, les lingots et les blocs : les vendre ralentissait toutes les constructions. La feuille le dit : « Le Bois et le Fer restent au village. »
- **Valeurs baissées** : Court 60 %, Moyen 80 %, Long 100 % de la valeur de référence (avant : 80 / 100 / 120 %). Le reste ne change pas : durées, capacités, chances de rare et d'objet, Long au niveau 3.

## Vérification de campagne (robot en vrais combats, 3 parties par version)
Le robot joue comme un joueur appliqué :
- il construit la Taverne et la Halle quand l'or le permet ;
- il livre les contrats en gardant la moitié du plafond ;
- il fait tourner la caravane en continu ;
- il fabrique par lots raisonnables.

Les temps de partie sont longs parce qu'il attend ses matériaux chantier après chantier. Ils servent à comparer les versions entre elles.

| Version | Temps de partie | Blé, Viande, Eau, Pierre au plafond | Utilisation de la production brute | Or du village (Taverne + Caravane) | Or des combats |
|---|---|---|---|---|---|
| v3.417 (avant le chantier) | 153 h | 13 à 51 % du temps | 43 à 70 % | 7 600 | ~16 000 |
| v3.420 (caravane avec Bois et Fer, 80/100/120 %) | 178 h | 0 % | 86 à 88 % | 26 000 | ~16 000 |
| **v3.421** | **150 h** | **0 %** | **86 à 89 %** | **14 800** | ~16 000 |

Avec la v3.421 :
- **plus de surplus bloqué** au plafond ;
- **temps de partie inchangé** ;
- **+7 200 or** sur toute la campagne, environ +22 % de l'or total ;
- une caravane Long rapporte en plus une dizaine de matériaux rares et un objet sur la campagne.

## Technique
- `caravan-system.js` : `CARAVAN_EXCLUDED = ["bois", "fer"]` (lu par `getEligibleKeys`) et les nouveaux `valuePct`.
- `caravan-view.js` : une ligne d'explication. 1 texte nouveau, traduit.
- L'Entrepôt ne cite plus la caravane dans « Où ça part » pour le Bois et le Fer : c'est automatique, il lit `getEligibleKeys`.
- Outil d'analyse non livré (`sim/_campagne-stock.js`) : le robot sait maintenant faire du commerce et fabriquer par lots.

## Fichiers protégés
Aucun.

## Harnais
Section [191] adaptée : valeurs, ressources éligibles sans Bois ni Fer, chargements et or attendus.

Résultats : round **3 747 OK** (deux passages), boot 4, création 44, parcours 139, campagne 38, i18n **100 % (3 753 textes)**.
