# v3.685.0 — Interface (audit du 04/11, lot I6)

Corrections locales d'interface : contrastes sur les jetons existants (mesurés au pixel dans Chromium, 320×568 et 390×844), feuilles et boutons qui répondent mieux. Aucune refonte transversale.

- **UI-1** : la marge de fin de liste sous les bulles (F0+, v3.650) se rattrape quand le dock était vide au premier rendu (`setHudDockSpace`, relu tant qu'elle vaut 0). Mesuré après chargement : 3 bulles, dock 136 px, marge 148 px (0 avant). `js/ui/hud-dock-view.js`.
- **UI-4** : une livraison d'atelier redessine la seule feuille ouverte qui lit la ressource (coût du bâtiment, intrant d'un atelier, fiche de stock), jamais `renderPanel` (choix v3.98.21). Saisie en cours épargnée. `js/ui/production-view.js` (`refreshOpenSheetAfterDelivery`), `js/systems/workshops-system.js`.
- **UI-5** : « Tu es à terre… » sur crème opaque, bordure `--ink-missing` : 10,6:1 (2,38 avant). `css/04-panel-camp.css`.
- **UI-6** : état vide d'Aventure, « À propos » (version, Admin) et « Renoncer à cette aventure » en encre claire avec ombre : 6,6 à 8,2:1 (1,15 à 1,26 avant). `css/00-kbtn.css`.
- **UI-7** : les titres `.ksec` posés dans la page (bande crème) gardent l'encre sombre : « Zone de danger » 10,6:1, « Emplacements à venir » du Grimoire idem (1,07 avant). `css/00-kbtn.css`.
- **UI-8** : butin du rapport de fin et du campement de donjon à l'encre de rareté (`--rarity-*-ink`) : 5,8 à 6,5:1 (1,94 à 3,58 avant) ; espace entre « Butin » et la liste. `js/ui/dungeon-view.js`.
- **UI-12** : la phrase de l'Enchanteresse passe à la ligne au lieu d'être coupée. `css/04-panel-village.css`.
- **UI-15** : « Sauvegarder maintenant » affiche « Partie sauvegardée » (ou la raison de l'échec). `js/ui/settings-view.js`.
- **UI-16 (= CPL3-9), partie Retour** : Retour d'Android et Échap sur la carte vivante reviennent à la carte du monde (plus au Camp). `js/ui/ui-root.js`.
- **UI-21** : « Hors de portée » et « il faut te soigner » en `--ink-missing` (6,6 et 5,7:1), ▲ de Comparer en `--nb-green-text` (5,5:1, ▼ en `--ink-missing`), conseils de combat et titres du soir en `--c-brown-700-soft` (6,1 et 5,7:1), « Carte › » à l'encre sombre sur l'or (4,9:1, 2,5 avant). `css/04-panel-forecast.css`, `css/04-panel-equipment.css`, `css/03-combat-v2.css`, `css/04-panel-camp.css`, `css/04-panel-expeditions.css`.
- **UI-22** : titres d'actes sur deux lignes au plus en format large, barres alignées. `css/10-grand-ecran.css`.
- **QA-3** : « Abandonner la tentative » demande confirmation et dit la part gardée (« Tu gardes 50 % du butin ramassé… », Mémoire « Ce qui reste » comprise) ; « Reprendre le combat » reste au-dessus. `js/ui/dungeon-view.js`.
- **QA-5** : « Renouveler » l'échoppe : anti-rebond de 800 ms, un double toucher ne paie plus deux fois. `js/systems/equip-shop-system.js`.
- **QA-12** : sans vivres, « Entrer » est grisé, la raison s'affiche au-dessus et « Voir les vivres » ouvre la fiche de la ration ; ligne « Vivres » manquants en `--ink-missing`. Mesuré à 320 px : raison 292 px, deux boutons de 48 px, aucun débordement. `js/ui/dungeon-view.js`, `css/04-panel-dungeon.css`, `css/04-panel-village.css`.
- **QA-13** : écran titre, emplacement illisible : résumé de la copie de secours (que le chargement reprend), marqué « copie de secours », ou « Sauvegarde illisible » sans copie ; plus de « niv. 1 ». `js/ui/title-screen-view.js` (save-system non touché).
- **QA-14** : « Vague x / 15 » à l'encre sombre (1,02:1 avant). `css/04-panel-dungeon.css`.
- **NOV-18** : un écran dont l'onglet parent est verrouillé (Boutique sans Village) allume le Camp, plus une case vide. `js/ui/ui-root.js`.
- `js/lang/en.js` : nouveaux textes traduits. « Quoi de neuf » : une ligne.
- `tools/harness/round-harness.js` [450] : un contrôle par correction (24) ; [175] et [181] acceptent `saveGameFromSettings()`.

Vérifié dans Chromium à 320×568 et 390×844, 85 écrans : aucun débordement horizontal ; 37 (390) et 44 (320) textes relevés sous 4,5:1 par l'audit n'y sont plus ; les nouveaux relevés bas portent sur des éléments non touchés (jauges, écrans ajoutés à la mesure).

Laissés :
- UI-3 : déjà fait en v3.683.0.
- QA-V1, QA-1, QA-2, QA-4, QA-8, QA-9, NOV-7, NOV-19, NOV-20, NOV-21 : déjà corrigés (v3.675 à v3.684).
- COMB-7, UI-9, UI-10, UI-14, UI-18 : UI transversale ou déplacement, atelier d'abord.
- UI-11 (cartes d'achat voilées) : deux options sans recommandation tranchée (poser `.affordable` ou retirer le voile), choix de Seb.
- UI-16, partie « Échap = Compris » des tutoriels à un bouton : fenêtres sans croix bloquant le Retour, décision v3.536.0 (option A) ; tutoriel non retravaillé.
- QA-7 : tirage figé 4 h par secteur, nouvelle règle de jeu (décision de Seb).
- UI-2, UI-17 : décisions closes.
- Signalements d'images (TUTO-12 = UI-20) : décision de Seb.

Aucun fichier ajouté. Aucun fichier protégé touché.

Contrôles : round 6 241 OK (2 passes), boot 4 OK, création 44 OK, parcours 212 OK, i18n 100 % (0 orphelin).
