# Aethervale v3.416.0 — Entrepôt et nouvelles illustrations (lot VUI-3)

Troisième et dernier lot de la refonte du Village (atelier validé le 01/10/2026, version 8). S'applique sur la v3.415.0.

## Entrepôt
- **Tuiles T3 sombres** : grande icône, le nombre et le nom sur un bandeau en bas. Selon les cas :
  - un filet doré montre le remplissage jusqu'au plafond pour les matières brutes ;
  - liseré rouge quand la ressource est pleine ;
  - pastille ♻ verte quand un atelier est en train d'en fabriquer.
- **Un seul filtre, en liste déroulante « Afficher ▼ »** :
  - Tout, Matières brutes, Fabriqué et Rare ;
  - Pleins (nombre en rouge) et En fabrication ;
  - Ma sélection, et en bas **Choisir ma sélection…**.
  - Chaque entrée affiche son nombre de ressources. Toucher ailleurs replie la liste.
- **Interrupteur « Zéros »** à côté. Il est coupé par défaut : les ressources à zéro sont masquées, et une ligne dit combien.
- **Ma sélection** : une feuille où chaque ressource se coche ou se décoche. Raccourcis « Tout afficher » et « Cacher les zéros ». **Valider** passe le filtre sur « Ma sélection ».
- **Mémorisés sur l'appareil** (décision Seb) : le filtre, la sélection et les zéros, comme les autres réglages d'affichage. Ils ne passent pas par la sauvegarde.
- Un avertissement en haut : « N ressources au plafond : leur production est à l'arrêt ».
- Les onglets Bruts / Tier 1 / Rares et le panneau de détail à droite sont retirés.

## Feuille d'une ressource (au toucher d'une tuile)
- **Description et plafond** : la jauge, et « Au plafond : Champs ne produit plus » quand c'est le cas.
- **D'où ça vient** :
  - le bâtiment de production (débit, ce qui attend d'être récolté, « Récolter » ou « Bloqué ») ;
  - les ateliers qui la fabriquent, avec leur état ;
  - pour un butin, son origine.
- **Où ça part** :
  - les ateliers qui la consomment ;
  - les autres débouchés, lus dans les données : constructions, zones de production, amélioration des ateliers, Apothicaire, contrats de la Taverne, Forge, repas au Campement.
- **Réserve protégée** : boutons − et + par 10 (décision Seb), et le nombre se saisit aussi au clavier. Sous le réglage, « Libre : N ». Elle n'apparaît que pour les ressources qu'un atelier consomme.
- La valeur de référence pour la Taverne, comme avant.
- Chaque ligne de bâtiment ou d'atelier ouvre sa feuille.

## Nouvelles illustrations
- **Les six bâtiments de production** (Champs, Chasse, Scierie, Mine, Carrière, Puits) utilisent tes nouvelles images isométriques, détourées sur fond transparent, à la place des médaillons ronds. Mêmes chemins : `images/Production/*.png`.
- **Atelier de Construction** : ta nouvelle icône, détourée, remplace `images/Icons/construction_icon.png`. On la voit dans la grille Bâtiments, l'onglet du rail, l'écran de retour et la fiche du bâtiment.
- Vignettes de production redimensionnées pour ce format.

## Technique
- `warehouse-view.js` réécrit :
  - filtre : `getWarehouseFilter`, `setWarehouseFilter` (même nom qu'avant, nouvelles valeurs), `toggleWarehouseMenu`, `toggleWarehouseZeros` ;
  - feuille d'une ressource : `openWarehouseSheet`, `buildWarehouseSheetHTML`, `stepWarehouseReserve`, `warehouseGoTo`, `refreshWarehouseSheets` ;
  - Ma sélection : `openWarehousePicker`, `buildWarehousePickerHTML`, `validateWarehousePicker` ;
  - **retirés** : `selectWarehouseKey`, `buildWarehouseDetailPanelHTML` et `buildWarehouseReserveHTML`.
- Préférences de l'appareil (`Prefs`) : `whFilter`, `whZeros` et `whHidden`.
- `production-view.js` (le rendu du Village redessine aussi la feuille de l'Entrepôt), `village-view.js` (changer d'onglet la ferme) et `village-building-view.js` : une seule feuille ouverte à la fois.
- CSS :
  - styles de l'Entrepôt dans `04-panel-village.css` ;
  - anciennes règles de l'Entrepôt retirées : tuiles, réserve, aide, stepper ;
  - `09-wide.css` : huit colonnes de tuiles.
- `tools/css-palette.py` relancé (6 couleurs très proches rattachées, quelques jetons renommés à valeur égale). Plusieurs fichiers CSS sans lien avec le Village en sont retouchés. **Rien ne change à l'écran.**
- Textes : 32 nouveaux, traduits en anglais ; 8 orphelins retirés.

## Fichiers protégés
Aucun.

## Harnais
- Sections [PA3b] (Rares) et E6 (Taverne) adaptées à la liste déroulante et à la feuille.
- Nouvelle section **[188]** :
  - défauts, plafond, zéros masqués, interrupteur ;
  - liste déroulante, Pleins, Ma sélection, préférences de l'appareil hors sauvegarde ;
  - feuille du Blé (d'où, où, réserve ±10, plancher à 0), de la Planche, de la Sève et de la Petite ration ;
  - fermeture au changement d'onglet ;
  - illustrations détourées.
- Résultats : round **3 694 OK** (deux passages), boot 4, création 44, parcours 139, campagne 38, i18n **100 % (3 714 textes, 0 orphelin)**.

## À tester en jeu
- Ouvrir l'Entrepôt : les ressources à zéro sont masquées et l'interrupteur « Zéros » les fait revenir.
- La liste déroulante : choisir « Pleins », puis « Choisir ma sélection… », décocher deux ressources et Valider. Fermer le jeu et le rouvrir : le filtre et la sélection sont gardés.
- Toucher le Blé plein : aller aux Champs depuis la feuille, puis au Moulin.
- La réserve : −, +, et la saisie au clavier.
- Les nouvelles illustrations : Production, feuille d'un bâtiment, Bâtiments (Atelier), rail.
- Si une ancienne illustration reste affichée, recharge la page : les images ne sont pas en précache, mais le navigateur peut garder l'ancienne en cache.
