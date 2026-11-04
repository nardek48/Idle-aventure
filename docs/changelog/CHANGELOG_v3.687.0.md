# v3.687.0 — Économie et village (audit du 04/11, lot I8)

Corrections d'affichage, de texte, de garde et de bug de l'économie du village, sans nouveau chiffre d'équilibrage. Le choix sur la Forge 6 et 7 (ECON-1) reste à Seb : les messages ajoutés lisent la vraie limite et resteront justes quelle que soit l'option retenue.

- **EQUI-2 (= ECON-3, SUIV-2, VER-1 en partie)** : `WarehouseManager.getUsableCap(k)` = min(plafond, part gardée par le versement automatique du Grand Ouvrage) et `capHint(k, besoin)` : « Le Grand Ouvrage n'en laisse que {c} : monte l'Entrepôt, ou relève la réserve protégée de {x}. » (ou « L'Entrepôt n'en garde que {c} : monte l'Entrepôt. »). Lu par les coûts des chantiers et des reforges, le « Ce qui manque » des paliers d'Histoire (plus « Carrière » pour la pierre de la Forge 6) et les fenêtres de zone (ligne sous le bouton grisé). `ProductionPlotsSystem.overCap`, mort depuis v3.612, compare à `getUsableCap` et sert aux refus des parcelles. `js/systems/warehouse-system.js`, `js/systems/production-plots-system.js`, `js/ui/village-building-view.js`, `js/ui/production-view.js`, `js/data/story-quests.js` **(quêtes, protégé, une ligne)**.
- **EQUI-3** : journal « Pierre +20 (Entrepôt), +40 (Grand Ouvrage) » ou « Pierre +60 (Grand Ouvrage) » au lieu de « Pierre +60 (Entrepôt) ». Le suivi de la chaîne de l'Atelier (bois, pierre) est aussi relancé quand le Grand Ouvrage prend une part. `js/systems/warehouse-system.js`.
- **ECON-4** : fabrication manuelle bornée par la place en sortie, lots en file compris (`getOutputRoomTimes`, `getMaxManualCraftTimes`) : plus d'intrants débités pour un produit perdu ; refus « {x} est au plafond de l'Entrepôt ». Le Continu garde sa borne. `js/systems/workshops-system.js`, `js/ui/production-view.js`.
- **ECON-5** : feuille d'atelier : « En attente : {x} est au plafond de l'Entrepôt. » quand c'est le produit qui est plein (plus « la réserve protégée »). `js/ui/production-view.js`.
- **ECON-6** : `GrandOuvrage.autoKeep` borné au plafond : une réserve protégée au-dessus du plafond n'empêche plus le versement, la récolte n'est plus perdue. `js/systems/grand-ouvrage-system.js`.
- **CPL2-1 / ECON-7** : la vitrine garde son multiplicateur de prix (`priceMult`) ; une vitrine tirée dans un monde plus bas que celui de son prix (voyage en arrière) est retirée quand le héros remonte (`hasStaleWorldStock`), minuteur et compteur gardés comme v3.209.0. En progressant normalement, la vitrine garde ses prix (v3.114.0 inchangée). Les vitrines d'avant sont repérées par leur prix. `js/systems/equip-shop-system.js`.
- **ECON-8** : prix du festin au monde le plus loin atteint (`WorldCaps.getReachedWorldIndex`). `js/systems/camp-system.js`.
- **ECON-9** : l'alerte « au plafond » de l'Entrepôt n'ajoute plus le coût de niveau hérité des bâtiments à parcelles. `js/ui/warehouse-view.js`.
- **ECON-10** : « Où ça part » cite le Grand Ouvrage (« versé tout seul au-delà de {p} % du plafond » ou « à verser à la main ») et le festin (Blé, Viande, Eau). `js/ui/warehouse-view.js`.
- **ECON-11** : sous l'interrupteur « Achat automatique », une ligne dit quand il ne peut plus rien acheter et pourquoi (prochaine parcelle au-delà de ce qu'il peut dépenser, ou au-delà du stock). `js/systems/production-plots-system.js` (`getAutoBlock`), `js/ui/production-view.js`.
- **ECON-12** : or des caravanes affiché avec le bonus du Grand Ouvrage (départ, route, retour, résumé des Expéditions) : `CaravanManager.unloadGold`, le même calcul que le déchargement. `js/systems/caravan-system.js`, `js/ui/caravan-view.js`, `js/ui/expeditions-view.js`.
- **ECON-13 (texte)** : le Givre bleu cite « caravane longue au Marché de la Tour ». `js/data/hunt-quests.js`.
- **ECON-15** : « Autovente » devient « Auto-offrande » (Sac et barre de l'inventaire). Sous 360 px, le bouton passe sur deux lignes : mesuré à 320 px, le menu « Afficher » garde 117 px (sans débordement ; 94 px pour 114 de contenu sur une ligne). `js/ui/heros-screens-view.js`, `js/ui/equipment-view.js`, `css/04-panel-heros-screens.css`.
- **SUIV-6** : l'or des livraisons et du rachat de Sarkel (événements du village) entre dans « Or gagné » ; la prime de battue aussi. `js/systems/village-event-system.js`, `js/systems/hunt-quest-system.js`.
- **ARCH-6** : une ligne de « Files » ouvre la feuille de son atelier. `js/ui/workshop-summary-modal.js`.
- `js/lang/en.js` : textes nouveaux traduits, textes remplacés retirés. « Quoi de neuf » : une ligne.
- `tools/harness/round-harness.js` [452] : un contrôle par correction (31) ; [341] lit la nouvelle raison de `overCapReason`.

Vérifié dans Chromium à 320×568 et 390×844 : feuille d'atelier à sortie pleine (alerte 292 / 362 px, pas de « Fabriquer »), fenêtre de zone (raison sous « Défricher »), ligne de l'achat automatique, fiche du Blé (Grand Ouvrage, festin), bouton « Auto-offrande » ; aucun défilement horizontal, aucune erreur.

Laissés :
- ECON-1 / EQUI-1 / QUET-3 : Forge 6 et 7, option A/B/C de Seb.
- ECON-2 : revente des potions préparées, décision E6 de Seb.
- EQUI-2, partie toasts « Entrepôt plein » : avec le versement automatique rien n'est perdu ni bloqué, un toast « plein » serait faux ; un nouveau signal sur le stock gardé est un choix d'interface (Seb, atelier d'abord). La limite est dite là où elle bloque (coûts, paliers, zones).
- ECON-13, rachat du Givre bleu par Sarkel : nouveau prix, à Seb.
- ECON-14 : outillage de campagne (lot I2).
- CPL2-1 / ECON-7, effet de bord à connaître : un aller-retour Tour → Forêt → Tour retire la vitrine deux fois sans payer (le retour en arrière le faisait déjà depuis v3.209.0).

Aucun fichier ajouté.

Contrôles : round 6 307 OK (2 passes), boot 4 OK, création 44 OK, parcours 212 OK, i18n 100 % (0 orphelin).
