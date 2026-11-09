# v3.750.0 — Journal de test : huit relevés de plus (demande de Seb, 09/11)

Aucun changement de jeu : seul le journal de test (Paramètres › Appareil) note plus de choses.

- `js/main/journal-test.js` :
  1. « preparation » : chaque préparation de l'Apothicaire (recette, pressée ou non, or payé) ;
  2. « achat_potion » : potions achetées en or (id, or) ;
  3. « quete_fin » : issue (victoire, fuite, mort, echec), PV et rounds du dernier combat ;
  4. « equipement » : emplacement, rareté avant et après, PV max avant et après ;
  5. « objets_emportes » au départ, « objet_contre » à chaque contre posé (une fois par ennemi et par objet, avec le round) ;
  6. « donjon_debut » et « quete_debut » : compagnons présents (groupe) ;
  7. « releve » : stock d'Acier, Verre trempé, Clé de voûte, Cire consacrée, Obsidienne taillée, Verre de faille ;
  8. « expedition » d'une carte : secteur et gisants réveillés ou laissés.
- `tools/harness/round-harness.js` : section [503] ; [500] suit le nouveau format d'« expedition ».

Contrôles : round-harness 7 218 OK, 0 échec (×2) ; boot 4 OK ; création du héros 44 OK ; i18n 8 896 textes, 100 % ; parcours 235 OK.
