# Aethervale v3.419.0 — La Caravane de la Halle marchande (lot E-2)

Décision R3 de Seb du 01/10/2026. Version C1 « Surplus auto » de l'atelier (`atelier-caravane.html`). S'applique sur la v3.418.0.

## Ce qui change
- **La feuille de la Halle a deux segments** : **Caravane** (ouvert par défaut) et **Agrandir · niv. N** (la fiche habituelle : effet, échoppe, coût).
- **Trois trajets** :

| Trajet | Durée | Capacité (Halle 1) | Valeur | Bonus |
|---|---|---|---|---|
| Court | 1 h | 150 | 80 % | — |
| Moyen | 4 h | 400 | 100 % | — |
| Long | 8 h | 800 | 120 % | 25 % : matériau rare du monde (2 ou 3) · 10 % : un objet d'équipement |

- **Niveau de la Halle** :
  - Court et Moyen s'ouvrent au niveau 1, **Long au niveau 3** ;
  - **+10 % de capacité par niveau** à partir du niveau 2 : ×1,9 au niveau 10, soit 1 520 unités pour le Long.
  - Le texte du niveau l'annonce : « trajet Long · Caravane +30 % ».
- **Chargement automatique (C1)** :
  - seules les **matières brutes** partent : Blé, Viande, Eau, Pierre, Bois, Fer ;
  - la caravane prend d'abord ce qui est **au plafond**, à parts égales, puis le reste ;
  - **garde** : elle ne descend jamais sous la **moitié du plafond**, ni sous la **réserve protégée** de l'Entrepôt.
- **Valeur** : la valeur de référence de la Taverne × le pourcentage du trajet. L'or est calculé au départ.
- **Matériau rare** : celui du monde où l'on part. Sève d'Aeswyn en Forêt, Verre des dunes au Désert. Le matériau rare et l'objet sont **tirés au départ** : recharger la partie ne relance rien.
- **En route** :
  - la piste (Forêt ou Désert), la caravane qui avance et le compte à rebours ;
  - l'or attendu et les chances du trajet Long.
  - Elle continue **hors ligne**. **Une seule caravane à la fois.**
- **De retour** :
  - une annonce (une seule fois) ;
  - un ruban vert **« 🐪 De retour »** sur la tuile de la Halle, une pastille sur l'onglet Bâtiments et une sur le segment Caravane ;
  - le butin, puis **Décharger**. L'or va au trésor, le matériau rare à l'Entrepôt, l'objet au sac. Si le sac est plein, l'objet est offert, comme partout.
- **Entrepôt** : « Où ça part » cite la Caravane pour les matières brutes.
- **Textes** :
  - la Halle : « Envoie une caravane vendre le surplus… » ;
  - la Taverne n'est plus le « seul débouché ».

## Ordres de grandeur (fin du Désert, Halle niveau 3)
- Long plein (960 unités) : environ **1 440 or** en 8 h, plus le rare et l'objet.
- Moyen : environ **600 or** en 4 h.
- La battue du Désert rapporte environ 340 or/h : la Caravane complète ce revenu, sans le remplacer.

## Technique
- **Nouveau** `js/systems/caravan-system.js` (`CaravanManager`) :
  - trajets, capacité, part libre (`getSpare`) et chargement (`computeLoad`) ;
  - départ, arrivée (`checkArrival`) et déchargement ;
  - horloge isolée (`_now`) pour le harnais.
- **Nouveau** `js/ui/caravan-view.js` : les trois moments de la feuille, `refreshCaravanDOM()` (chaque seconde, branché sur `refreshProductionSheetDOM`) et le trajet choisi mémorisé sur l'appareil (`Prefs` : `caravanTrip`).
- **État** : `game.village.caravan`. `game.village` est déjà sauvegardé tel quel, donc `save-system.js` n'est pas touché.
- `village-building-view.js` : segments de la Halle (`hallSheetSegment`, `setHallSheetSegment`).
- `village-view.js` : ruban de la tuile et pastille de l'onglet Bâtiments.
- `village-buildings.js` : texte du niveau de la Halle, descriptions de la Halle et de la Taverne.
- `warehouse-view.js` : ligne « Caravane de la Halle ».
- `04-panel-village.css` : styles `.car-*`.
- `tools/css-palette.py` relancé : quelques jetons renommés à valeur égale, **rien ne change à l'écran**.
- `index.html` et `sw.js` : les deux nouveaux fichiers sont chargés et précachés.
- Textes : 31 nouveaux, traduits. Les 2 descriptions modifiées sont retraduites. 0 orphelin.

## Fichiers protégés
Aucun.

## Harnais
Nouvelle section **[191]** :
- trajets, ouverture du Long à la Halle 3, capacités ;
- ressources éligibles, part libre (moitié du plafond, réserve), chargement à parts égales ;
- départ, une seule caravane à la fois, présence dans la sauvegarde ;
- feuille en route, retour hors ligne annoncé une fois, ruban et pastille, Décharger ;
- tirage du Long (Verre des dunes et objet), texte du niveau, ligne de l'Entrepôt, chargement des fichiers.

Résultats : round **3 735 OK** (deux passages), boot 4, création 44, parcours 139, campagne 38, i18n **100 % (3 752 textes, 0 orphelin)**.

## À tester en jeu
- Halle niveau 1 : le Long est verrouillé (« Halle niveau 3 »).
- Lancer un Moyen et regarder le chargement : il ne reste jamais moins de la moitié du plafond.
- Fermer le jeu, revenir après l'heure de retour : le ruban « De retour » est sur la tuile de la Halle.
- Décharger.

## À venir
- **La marque sur la carte du monde** : la caravane sur la piste ; la toucher ouvrira la Halle.
- **Comptoirs** (idée de Seb, plus tard) : des destinations à débloquer sur les cartes, qui achètent une ressource avancée de la région et rapportent des matériaux difficiles à trouver ailleurs. À noter dans l'état des chantiers.
- **Icône de caravane** à produire : l'emoji 🐪 tient la place.
