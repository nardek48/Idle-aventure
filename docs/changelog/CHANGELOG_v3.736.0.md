# v3.736.0 — Grimoire vivant : 3 règles, jeux et pronostic qui prépare (07/11/2026)

Demande de Seb (07/11) : le Grimoire doit servir à préparer chaque combat, pas se régler une fois pour toutes. Étude `systemes/combat/Aethervale_Etude_Grimoire_vivant_v0_1.md` (6 règles universelles suffisaient à tout le jeu ; adapter rapportait +1,4 point). Pistes 1 et 2 validées ; atelier `atelier/grimoire-vivant.html`, choix de Seb : pronostic B, puis A partout. Aucun fichier protégé ; `save-system.js` inchangé (le jeu actif est un champ `actif` des préréglages déjà sauvegardés).

## Changé
- **3 règles actives** (la 3e aux Ruines), au lieu de 6.
- **Jeux de règles en onglets** (les préréglages) : on change de jeu d'un toucher ; ce qu'on modifie s'écrit dans le jeu actif. 3 jeux au début, un de plus par monde, jusqu'à 6 à la Tour. La Mémoire « Grimoire étendu » garde « une règle de plus » dans la limite de 3.
- **Préparation de sortie** : « Ce que tu vas affronter » liste les situations du combat, cochées couvertes / pas couvertes par le jeu actif, avec la règle conseillée, « Ajouter » et « Tout préparer ». Trois emplacements pleins : la règle sans objet pour ce combat est remplacée d'office, avec « Annuler » ; sinon le joueur choisit. La section « Tes règles » (jeux, ★ sur le conseillé) est visible sous le pronostic.
- **Phases actives dès le round 1 annoncées** (exception à v3.378.0, ces phases seulement) : la Silhouette prend le trait de ta classe (Enragé, Blindé, Silence).
- Situations jamais rencontrées : comptées (« N situations encore inconnues »), pas nommées (v3.729) ; boss jamais vaincu : « le boss ».
- **Parties en cours** : règles 1 à 3 actives ; règles 4 à 6 → un jeu « Mes autres règles » ; préréglages à 6 règles : les 3 premières jouent, les autres restent stockées.
- Haut fait « Un plan de rechange » : demande un deuxième jeu.

## Mesures
Banc (15 scénarios × 3 classes, 100 parties) : +1,5 point en moyenne avec « Tout préparer » ; Silhouette Chevalier 35 → 85 %, Dragon Chevalier 84 → 97 %, Nécromancien Mage 93 → 100 % ; Pentes Mage 78 % (47 % sans préparer). Silhouette Rôdeur 1-2 % (problème de dégâts, à part). Campagne `--n 2` : 6/6 au bout, médiane 30,3 h (32,2 h en v3.732), aucun mur nouveau ; tour_18 bloque 1 Rôdeur sur 6 (5 parties sur 9 en v3.732).

## Contrôles
round-harness 7 088 OK, 0 échec (2 passes), dont la section [496] ; boot ; création du héros ; i18n 0 manquant, 0 orphelin ; parcours 235 OK.
