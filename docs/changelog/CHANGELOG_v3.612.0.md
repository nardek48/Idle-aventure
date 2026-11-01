# v3.612.0 — Zones : 3 parcelles qui montent par monde, achat automatique

Idée de Seb (01/11), mesurée au banc (`tools/sim/parcelles-bench.js`), puis prototypée dans l'atelier (`atelier/parcelles.html`). Choix : disposition B et coûts lissés.

## Modèle
- Chaque bâtiment de production n'a plus que **3 parcelles** (rapide, moyenne, lente) dans tous les mondes : `isPlotRowOpen` répond vrai pour les index 0 à 2 seulement. Le stockage garde ses 9 entrées.
- **Plafonds** : 5, 10, 12, 15, 17 niveaux, de la Forêt à la Montagne (`WORLD_CAPS[].zoneLevel`, `zoneRows: 1`).
- **Débit par niveau** : calculé par ancres (`PRODUCTION_PLOTS_SHARED.p3Anchors`, `levelMult`). Inchangé jusqu'au niveau 5 ; au plafond de chaque monde, les 3 parcelles produisent autant que les zones d'avant.
- **Coûts** : la Forêt garde les siens. Au-delà, chaque monde reprend le coût total de ses anciennes zones (ouvertures et niveaux) et le répartit sur les niveaux du monde, chacun 25 % plus cher que le précédent (`getP3UpgradeCost`). Par exemple, au Désert : 32 → 40 → 50 → 62 → 78 fer.
- **Migration** (`migrateToParcels`, modèle 3) : chaque parcelle reprend sa colonne d'avant, avec ses améliorations et son stock. Son niveau est le plus petit qui produit au moins autant que toute la colonne. Les parties d'avant le relevé 2 passent d'abord par l'ancienne conversion.

## Achat automatique
- Disponible dès le Désert et actif par défaut, avec un interrupteur sous les parcelles (`game.village.plotAuto`).
- Il défriche d'abord, puis monte la parcelle la moins chère. Il ne dépense que ce qui dépasse la moitié du plafond et la réserve protégée.
- Il passe toutes les 15 s (`ProductionManager.tick`) et après chaque récolte, avec une ligne au journal par passe.

## Interface
- L'onglet Zones de la fiche d'un bâtiment affiche 3 lignes : nom, profil, niveau, débit, améliorations, bouton du prochain achat (Défricher, Niv. N, amélioration) et jauge de la réserve. Toucher une ligne ouvre la fenêtre de la parcelle.
- La grille 3×3 et les barres par rangée sont retirées (`unlockRow`, `upgradeRow`, `improveRow`).

## Textes
- Quête du village « Agrandir un bâtiment : les zones » : l'erreur factuelle « 9 zones » est corrigée en « 3 zones ».
- Jalons recalés : Désert, six zones au niveau 8 ; Ruines, six au niveau 11 ; Crypte, neuf au niveau 14 ; Montagne, trois au niveau 17.
- Ligne ajoutée au Quoi de neuf (FR + EN).

## Contrôles
- round-harness : 5 782 OK, 0 échec, sur 2 passes. Nouvelle section [407] ; [86], [186], [189], [238], [300], [308], [328] et UX-PROD mises à jour.
- boot : 4 OK. Création du héros : 44 OK. Parcours : 142 OK.
- i18n : 100 %, 0 orphelin.
- Banc des débouchés : production théorique identique au Désert (167 202 par jour) et à la Crypte (443 704 par jour).
- Aucun fichier ajouté, aucun fichier protégé modifié.
