# v3.525.0 — Lisibilité et petits écrans (audit, lot 8)

Atelier `atelier/lisibilite-petits-ecrans.html` validé par Seb sur iPhone : 45 cas, « Proposé » partout, la variante recommandée pour 4 cas, et les bulles du dock gardées telles quelles (P28). Le portage a été relu sous trois angles (cascade, écrans voisins, conformité), chaque constat soumis à trois vérificateurs adverses ; les 6 défauts confirmés sont corrigés. Chaque cas a été recapturé dans le jeu modifié (Chromium, vraies sauvegardes, 320 à 390 px) et comparé au pixel à la vue validée. Aucun fichier protégé.

## Ce qui change en jeu
- **Combat (COM-4, COM-9)** :
  - le reset des boutons ne passe plus devant leurs classes. ATTAQUER retrouve son brun 18 px très gras (contraste 2,2:1 → 8,2:1), les pastilles 13 px gras, les alertes 12 px gras, les badges des ennemis leur or 13 px ;
  - la barre du haut passe devant la ligne de la cible : « ▶ x1 » retrouve sa zone de 44 px.
- **Titre de quête en combat** : 2 lignes au plus ; sous 360 px, 12 px et icône de contexte masquée. « Ce qui tourne autour du camp » et « Le Dragon ancien » se lisent en entier à 320 px.
- **Encres de rareté sur parchemin (INT-1)**, nouveaux jetons `--rarity-*-ink` :
  - commun #5b5f66, inhabituel #166534, rare #1d4ed8, épique #7e22ce, légendaire #92400e ;
  - les teintes vives restent pour les cadres, les halos et la pierre ;
  - où : carte et fiche des donjons, fiche Emplacement (liste « Dans le sac » sur la carte crème), fiche Objet et pouvoir des objets uniques, échoppe de la Halle et carte relique, reliques des compagnons, Enchanteresse ;
  - contrastes : commun 1,95 → 4,92, inhabituel 1,75 → 5,47, rare 2,82 → 5,14, épique 3,04 → 5,36 ;
  - la fiche d'un donjon perd l'ombre baveuse de « Butin : … » sur le crème (gardée sur la pierre).
- **Échoppe de la Halle** : les cartes d'achat ne restent plus à 80 % d'opacité (la classe `.affordable` n'était jamais posée).
- **Onglets inactifs (INT-4)** : encre `--nb-ink`, voile allégé (18 → 10 %), compteur à pleine opacité. Vaut pour Héros, Paramètres, Campement et le sélecteur des Talents.
- **Verrous (INT-3)** : emplacement du Grimoire, titres et cartes de donjon verrouillés. Plus de voile sur tout le bloc : cadre en pointillés, image ou icône éteinte, condition de déblocage en brun gras (2,2:1 → 7 à 8:1).
- **Hauts faits** :
  - « Réclamer » sur fond --nb-gold-deep, texte blanc (6,90:1) ;
  - la tête n'écrase plus « Titre porté » : « Tout réclamer » passe dessous en pleine largeur sur téléphone (borné à 260 px sur PC).
- **Tuiles du Sac et de l'Entrepôt** : nom sur 3 lignes, tuile +20 % de hauteur, image de même taille. À 320 px, plus que 2 noms coupés sur 27 au lieu de 12 (des mots trop longs, que la césure de l'iPhone coupera).
- **Expéditions** : les sous-titres des portes « Carte » et « Potions » passent à la ligne au lieu d'être coupés.
- **Zones de toucher de 44 px**, taille visible inchangée :
  - pastilles « ressource manquante » de la Forge, « Où en trouver › », « Réclamer », interrupteurs des Paramètres, « Règle › » ;
  - têtes d'accordéon de la Bibliothèque à 44 px ;
  - bouton d'achat des potions et de l'échoppe : zone invisible de 44 px.
- **Bouton principal désactivé** (Production, chantiers…) : gris complet à 0,8 d'opacité, libellé 5,1 → 6,4:1.
- **Tête du Camp (ERG-6, variante A)**, téléphone de moins de 700 px de haut : tête compacte sur Missions, Expéditions et Grimoire. À 320×568, « Accepter » remonte de 618 à 424 px.

## Correctifs de la revue
- Encres des donjons : la couleur venait de styles en ligne (`RARITY_COLORS`). La carte et « Butin : … » passent en `var(--rarity-*-ink)` dans `dungeon-view.js`, l'en-tête de pierre garde sa teinte vive.
- La fiche d'un donjon ne montre plus la variante écartée « ombre retirée seule » : l'ombre et l'encre partent ensemble.
- Forge : les liens « Où en trouver » passent devant les zones de 44 px des pastilles, et un coût sur deux lignes gagne 15 px entre ses rangées, pour qu'aucune zone ne prenne le toucher d'un voisin (0 mauvaise cible à 320 et 390 px).
- Hauts faits sur PC : « Tout réclamer » reste borné à 260 px.

## Code
- CSS : `00-tokens`, `00-components`, `00-kbtn`, `03-combat-screen`, `04-panel-achievements`, `-camp`, `-companions`, `-dungeon`, `-equipment`, `-expeditions`, `-grimoire`, `-heros-screens`, `-settings`, `-upgrades`, `-village`.
- `ui/dungeon-view.js` : encre de rareté sur la carte et dans « Butin : … ».
- Harnais [345] ; le contrôle [229] des zones de 44 px accepte des sélecteurs après `.kf-back::after`.
- Aucun fichier ajouté.

## Contrôles
- Round : 5 333 OK, 0 échec, sur deux passes.
- Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- i18n : 6 583 textes, 100 %, 0 orphelin.
- Contrôle au pixel des 45 cas dans le jeu : rendu identique aux vues validées, hormis les ennemis tirés au hasard et les correctifs voisins visibles sur la même capture.

## À voir en jeu
- L'écart de 15 px entre les rangées d'un coût de Forge sur deux lignes : ce cas n'était pas dans l'atelier.
- Le butin du campement et le bilan de donjon (fond de fiche) gardent les teintes vives : aucun cas ne les a mesurés.
