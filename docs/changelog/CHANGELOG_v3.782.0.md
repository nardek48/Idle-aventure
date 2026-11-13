# v3.782.0 — « Pendant ton absence » : récolte d'office, un bilan et la suite (13/11/2026)

Décision de Seb (13/11) : il y avait trop de touchers au retour. Atelier `atelier/retour-absence.html` (quatre variantes sur le vrai Camp, compteur de touchers), **variante C** retenue. Aucun fichier protégé modifié, aucun changement de sauvegarde, aucun fichier ajouté.

## Ce qui change (`ui/return-view.js`, `ui/patrol-view.js`)
- **À l'ouverture**, les gestes gratuits sont faits d'office :
  - la récolte des zones (plafond de l'Entrepôt compris, surplus au Grand Ouvrage comme avant) ;
  - le butin des patrouilles rentrées.
- **La fenêtre devient un bilan** :
  - « {durée} d'absence · tout est rentré » ;
  - rubriques cochées : Récolté, Ateliers et chantier, Patrouilles (le récit et « Relancer » restent) ;
  - Héros ;
  - plus d'avertissement « zones pleines » ; s'il reste du stock dans les zones parce que l'Entrepôt est plein, la ligne le dit.
- **Contrats de la Taverne** : une ligne qui renvoie au tableau des missions. Le bouton « Livrer » disparaît : les contrats se livrent au tableau depuis la v3.778.0.
- **Ration** : un lien « Manger », proposé seulement sous 70 % de PV (même seuil que l'alerte de départ). Une ration se consomme : c'est un choix.
- **Pied** : la prochaine action du fil rouge en bouton principal (« Accepter… », « Réclamer… »), et « Plus tard » qui referme. Sans proposition du fil rouge, « Continuer ».
- **Touchers pour revenir au jeu** :

  | Absence | Avant | Maintenant |
  |---|---|---|
  | Courte | 2 | 1 |
  | Longue | 4 | 1 |
  | Longue, PV bas | 5 | 2 |

- **CSS** (`04-panel-evolutions.css`) : styles des anciens gestes (`.ret-acts`, `.ret-next`, `.ret-road`) retirés ; coche, renvoi et pied ajoutés.
- **Traductions** : 4 textes nouveaux, 12 orphelins retirés.

## Contrôles
- `round-harness` 7130 OK, 0 échec, sur 2 passes ([127] R2 et R3, [262], [471] suivent la variante C).
- boot 4 OK ; création du héros 46 OK.
- Parcours complet 236 OK. P2 vérifie la récolte et le butin faits à l'ouverture, le bouton unique et « Plus tard ».
- Capture à taille iPhone sur une sauvegarde du robot au Désert.
- i18n 100 %, 0 orphelin.
- Quoi de neuf : une ligne (FR + EN).

## À suivre
Plusieurs fenêtres peuvent s'empiler au retour (« La Forge a changé », « Quoi de neuf », fin d'atelier…) : relevé et options à venir (signalement du 13/11).
