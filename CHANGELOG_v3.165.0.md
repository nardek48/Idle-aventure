# v3.165.0 — Icônes à 64 % + nouveau cadre légendaire

## Décision (Seb, après contrôle dans l'atelier)
Les cadres v3.164.0 sont validés ; nouveau `slot-legendary.png` fourni
par Seb (372×383, cavité plus généreuse que l'ancien) ; taille d'icône
figée à **64 %**.

## Changements
- `images/UI/slots/slot-legendary.png` : remplacé par la version de Seb.
- `css/00-rframe.css` : `--rframe-icon` 58 % → 64 %. Re-mesure au pixel
  avec le nouvel asset : cavité utile des 5 cadres entre 65,3 %
  (légendaire, le plus serré) et 68,8 % de la largeur de boîte → 64 %
  tient sur les 5 avec ≥1,3 % de marge.
- `css/04-panel-equipment.css` : replis `var(--rframe-icon, 58%)` → 64 %.
- `atelier-ui.html` : curseur par défaut à 64 %, plage élargie à 70 %
  (pour continuer à voir la limite de contact).

Aucun changement de structure ni de JS. Cadres de rareté : chantier
CLOS sous réserve de quelques jours d'usage réel sans retour négatif
(règle « un composant à la fois »).
