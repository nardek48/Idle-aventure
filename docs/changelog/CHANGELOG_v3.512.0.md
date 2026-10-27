# v3.512.0 — Une relique de compagnon à l'échoppe

Décisions de Seb du 27/10 : option A (une relique dans la vitrine), prix de base 1 000, variante B de l'atelier `atelier/reliques-echoppe.html`, couleur des reliques selon le monde, relique « Talisman » renommée.

## Ce qui change en jeu
- La vitrine de l'échoppe propose une relique à la 2e place, dès qu'un compagnon a un emplacement de relique ouvert (palier 5). Elle se renouvelle avec la vitrine.
- Famille au hasard, rang du monde le plus loin atteint. Prix : 1 000 × le multiplicateur du monde, soit 1 k / 4 k / 10 k / 25 k / 90 k de la Forêt à la Montagne.
- Carte marquée « Relique » : couleur du monde, rang sur l'icône, effet, et une pastille par compagnon (libre, mieux, ou rien à gagner). La relique achetée s'équipe dans la fiche du compagnon.
- Couleur des reliques comme l'équipement : Forêt commun, Désert vert, Ruines bleu, Crypte et Montagne violet, Tour orange. Aussi dans la fiche du compagnon.
- La famille « Talisman » s'appelle désormais **Emblème** (l'équipement garde son Talisman). Les reliques déjà obtenues sont conservées.

## Mesures (campagnes au robot, 2 par classe, achat si ≤ 30 % de la bourse)
- Prix de base 2 500 : 0 achat (toujours trop cher). Retenu : 1 000.
- Vitrine réelle (base 1 000) : 6/6 au bout, 0 mur, médiane 43 h ; 3 à 5 reliques achetées par campagne, surtout en Crypte (≈ 2, 45 k) et en Montagne (≈ 1,7, 140 k).
- Une campagne de Mage à 73 h : 24 h à forest_15 (boss, 4 défaites, attente des sorties de donjon du jour), sans lien avec les reliques.

## Code
- `systems/equip-shop-system.js` : `_relicOffer`, `_buyRelic`, `EQUIP_SHOP_RELIC_BASE_PRICE`. L'offre n'a pas de rareté d'équipement : elle ne déclenche pas de renouvellement au retour dans un monde précédent.
- `systems/companion-relic-system.js` : `rarity`, `grant`. `data/companions.js` : Emblème.
- `ui/equip-shop-view.js`, `ui/companions-view.js`, `css/04-panel-upgrades.css`, `css/04-panel-companions.css`.
- `lang/en.js` : 9 textes. Harnais [334]. Robot : `--relique-echoppe` (achat dans la vraie vitrine).
- Vérifié dans Chromium à 320 et 390 px : carte sans débordement, nom sur deux lignes à 320 px, achat (−90 k en Montagne), nom violet dans la fiche.
- Aucun fichier ajouté, aucun fichier protégé (commentaire seul dans `talent-system.js`, non protégé).
- Les 6 icônes de reliques manquent toujours : icône générique.
