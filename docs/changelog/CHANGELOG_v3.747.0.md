# v3.747.0 — Journal de test complété (analyse de la Crypte de Seb, 09/11)

Aucun changement de jeu : seul le journal de test (Paramètres › Appareil) note plus de choses.

- `js/main/journal-test.js` :
  - un boss qui se relève (Varrek) est noté « a_terre » à sa première chute, puis « victoire » quand il tombe pour de bon (il apparaissait deux fois en victoire) ;
  - « victoire » donne le nombre de rounds du combat ;
  - « donjon_debut », « quete_debut » et « expedition » donnent les PV d'entrée (pv0, en %) ;
  - une mort en Petite Aventure donne les PV avant le coup, le coup reçu, les gisants réveillés ou non et la difficulté du secteur ;
  - nouvelles lignes « caravane » (départ) et « caravane_retour » (or rapporté) ;
  - « reforge », « chantier » et « donjon_fin » donnent l'or dépensé ou gagné.
- `tools/harness/round-harness.js` : section [500].
- Outils (hors jeu) : corrections du robot de campagne tirées de l'audit A (Cire, Pierre et Cendre sans attente pour un achat facultatif ; chantier en deux essais ; 2 places de Petite Aventure gardées pour l'Histoire ; sortie du donjon à l'objectif tenu ; morts du chemin et d'entretien séparées dans la synthèse).

Contrôles : round-harness 7 191 OK, 0 échec (×2) ; boot 4 OK ; création du héros 44 OK ; i18n 8 892 textes, 100 % ; parcours 235 OK.
