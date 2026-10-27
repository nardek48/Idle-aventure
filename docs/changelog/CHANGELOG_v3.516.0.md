# v3.516.0 — Correctifs de l'audit, lot 0

Audit complet du 27/10 (`Aethervale_Audit_2026-10-27_v3515_0.md`), lot 0 : correctifs rapides sans décision. Seb suit les recommandations.

## Ce qui change en jeu
- **Feu de camp (TUT-1)** : il rend enfin les 5 % de PV par minute annoncés. L'arrondi de chaque seconde perdait 4 à 40 % du soin (60 % à 1 000–2 000 PV). Mesuré dans Chromium : 31 PV rendus pour 32 attendus en 30 s (1 281 PV max). Héros et compagnons au camp.
- **Fin de donjon (IMA-1)** : l'icône du rapport s'affiche (elle pointait vers un .png absent, d'où le « ? »).
- **Village (ERG-3)** : le ruban « Construire » et la pastille « Bâtiments » n'apparaissent que si le chantier est payable ; sinon la carte dit « Matériaux manquants ».
- **Mise à jour (ERG-4)** : si la bannière est apparue avant un combat, elle se masque pendant le combat et revient ensuite.
- **Fil rouge (ERG-8)** : la bulle se met à jour quand la proposition change de titre.
- **Lisibilité** : quantités manquantes en rouge foncé sur fond clair (6,4:1, INT-7) ; noms des potions sur deux lignes au lieu d'être coupés à 320 px (INT-6) ; les 3 rations du Camp tiennent dans leur carte à 320 px (INT-10) ; phrase des sorties du Donjon à 12 px (INT-13).
- **Icônes manquantes du combat (IMA-11)** : consignées comme ailleurs.
- Reporté à l'atelier de lisibilité (lot 8) : le bouton ATTAQUER (COM-4), qui change l'aspect de tous les boutons du combat.

## Code
- `systems/camp-system.js` (fraction de PV gardée en mémoire par membre, rien de sauvegardé), `ui/dungeon-view.js`, `ui/village-view.js`, `main/pwa.js`, `ui/hud-dock-view.js`, `ui/combat-screen-view.js`.
- CSS : `00-tokens.css` (`--ink-missing`), `00-components.css`, `04-panel-village.css`, `04-panel-camp.css`, `04-panel-dungeon.css`.
- Commentaires périmés : `sw.js` (38 Mo d'images), `data/dungeon.js`, `data/workshops.js`, `data/elites.js`, `data/combat-states.js`.
- Harnais [337]. Aucun fichier ajouté, aucun fichier protégé.
