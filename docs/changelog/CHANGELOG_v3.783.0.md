# v3.783.0 — Moins de fenêtres au retour (13/11/2026)

Signalement du 13/11 (atelier retour-absence) puis décision de Seb (option A) : plusieurs fenêtres s'ouvraient l'une après l'autre au retour. Aucun fichier protégé modifié, aucun changement de sauvegarde, aucun fichier ajouté.

## Ce qui change
- **« Quoi de neuf » ne s'ouvre plus tout seul** (`ui/news-view.js`).
  - S'il y a une fenêtre de retour : elle porte une ligne « N nouveautés depuis ta dernière visite › », qui ouvre « Quoi de neuf » (`ui/return-view.js`).
  - Sinon : une notification « Version X : les nouveautés sont dans Paramètres ».
  - La liste reste dans Paramètres › Voir les nouveautés.
  - Un appareil sans repère (première visite) n'a rien à rattraper.
- **« La Forge a changé » est retirée** (`ui/village-building-view.js`, styles de `css/05-overlays.css`). Cette fenêtre de migration de la v3.743 ne concernait que les parties d'avant ; la préférence `forgeMondesSeen` n'est plus lue.
- **Menu** : pas d'entrée « Nouveautés ». L'accès existe déjà dans Paramètres, et la règle « pas de pastille dans le menu » (v3.320.0) reste.
- **Traductions** : 3 textes nouveaux, 6 orphelins retirés.

## Contrôles
- `round-harness` 7132 OK, 0 échec, sur 2 passes. [127] vérifie la ligne « Nouveautés » et l'absence d'ouverture automatique ; [30c] le retrait de la fenêtre de la Forge.
- boot 4 OK.
- Parcours complet 236 OK. Une passe a échoué sur P7 (le chemin de la Petite Aventure est tiré au hasard, déjà vu avant ces changements) ; P7 seul passe 4 fois sur 4, et le parcours complet suivant passe.
- Capture à taille iPhone de la fenêtre de retour.
- i18n 100 %, 0 orphelin.
- Quoi de neuf : une ligne (FR + EN).
