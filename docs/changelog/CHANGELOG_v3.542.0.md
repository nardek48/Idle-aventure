# v3.542.0 — Enchanteresse : ce que vaut une relance (audit CMP-2, décision 1B ; 2A)

Décisions de Seb sur la mesure de l'après-Histoire : 1B (afficher le gain possible avant de payer), 2A (la Gueule du volcan ne change pas).

## La mesure (une campagne d'après-Histoire par classe, `--faille --apres 10`)
- **Enchanteresse** : 10 à 14 relances, 610 000 à 767 000 or, soit toute la bourse de fin d'Histoire.
  - Chevalier : PV +5,6 %. Rôdeur : PV +0,8 %. Mage : ATK +0,6 % et critique +3,3 points.
  - Toutes les lignes au maximum, le plafond n'est que de +8 % de PV et +5 % d'ATK.
- **Niveaux de donjon** (niveau tenu au moins une fois sur deux) :
  - Tanière : N30–32. Donjon 4 : N11–13. Gueule : N2–5.
  - Dès N1, la Gueule rapporte autant d'or que le donjon 4 à son meilleur niveau.
  - En mode libre, la Gueule à N2 rapporte environ 59 000 or.
- Outil : la Gueule entre au banc des niveaux, et son mode libre n'est plus refusé à tort (`tools/` seulement).

## Ce qui change en jeu
Sous « Maximum possible », chaque bonus de l'établi de l'Enchanteresse affiche maintenant :
- **« Une relance, en moyenne : … »**, le gain moyen d'une relance. Une relance ne baisse jamais : avec un tirage uniforme sur la fourchette, le gain moyen vaut (max − v)² / 2 (max − min). Il s'affiche « presque rien » quand il arrondit à 0.
- **« Au maximum, ton héros gagne … »**, l'effet réel sur le héros (PV, ATK, célérité, défense, critique, dégâts critiques), calculé par un recalcul des stats puis remis en place.

## À signaler (constat, rien de changé)
Le bonus « +X % dégâts » (`tapMult`) ne multiplie que les dégâts de base du héros, pas les dégâts fixes de l'arme, qui font l'essentiel de l'ATK. Sur la sauvegarde de fin d'Histoire, passer l'arme de +26 % à +40 % ne donne que +8 ATK sur environ 940. C'est pour cela que l'Enchanteresse rapporte si peu ; le nouvel affichage le montre au joueur.

## Code
- `ui/village-building-view.js` : `enchantGainHTML`, `enchantHeroDelta`, `enchantHeroSnapshot`.
- `css/04-panel-village.css` : `.ench-gain` passe à la ligne au besoin.
- `en.js` : 7 textes.
- Harnais [360].
- Aucun fichier protégé (stats-system.js est seulement appelé), aucun état sauvegardé, aucun fichier ajouté.

## Contrôles
- Round : 5 389 OK, 0 échec, sur deux passes. Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK. i18n : 100 %.
- Chromium à 390 et 320 px, sauvegarde de fin d'Histoire, Enchanteresse au niveau 2 : les lignes s'affichent pour chaque bonus, et les PV max et PV courants restent inchangés après le rendu. 0 erreur.
