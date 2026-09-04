# CHANGELOG v3.145.0 — Écran "Charger la Partie" en assets dédiés

## Contexte
Suite à v3.144.0 (bascule or/bronze de l'écran titre, écran "Charger" livré
en CSS pur faute d'assets). Seb fournit les 5 images manquantes → refonte
complète de l'écran "Charger la Partie" avec les vrais cadres/boutons.

## Nouveaux assets intégrés
- `images/TitleScreen/titre_charger.png` (ex `Titre_du_menu_chargement.png`)
  — bandeau "Charger une partie", remplace le `<h2>` texte.
- `images/TitleScreen/bouton_charger.png` (ex `Bouton_Chargement.png`) —
  bouton "Charger", utilisé à la fois par carte ET pour le bouton CHARGER
  global en bas (plus grand).
- `images/TitleScreen/bouton_retour_new.png`
  (ex `Bouton_retour_en_arrière.png`) — remplace `bouton_retour.png`.
- `images/TitleScreen/bouton_supprimer.png` (ex `bouton_Supprimer.png`) —
  icône poubelle ronde, remplace l'emoji 🗑.
- `images/TitleScreen/cadre_slot.png` (ex `Pastille_Hero.png`) — cadre de
  carte slot complet (parchemin clair, ratio 2503/784) avec médaillon rond
  **découpé en transparence** (pas un cercle blanc opaque). Remplace la
  carte 100% CSS de v3.144.0.

## Détail technique — médaillon transparent
`cadre_slot.png` a un vrai trou (alpha = 0) à l'emplacement du portrait, pas
un disque blanc. Mesuré par script (scan de pixels) : centre à 16.9% / 50.3%
de l'image, diamètre 20.1% (largeur) / 68.9% (hauteur). Le portrait du héros
est positionné en `position: absolute` à ces coordonnées exactes, avec
`z-index: 0`, et le cadre (`title-slot-card-bg`) est posé par-dessus en
`z-index: 1` — le portrait apparaît donc "à travers" le trou du cadre sans
recadrage manuel supplémentaire.

## Écran "Charger la Partie" — layout revu
- Carte slot : cadre `cadre_slot.png` en pleine largeur (aspect-ratio fixe
  2503/784), portrait en médaillon, texte à droite (nom + stats), colonne
  d'actions à droite (bouton Charger + bouton Supprimer, tous deux en
  image).
- Sélection (`.selected`) : `filter: drop-shadow` doré superposé au cadre —
  pas de variante "active" dédiée fournie pour cet asset, donc glow CSS.
- Carte vide : même cadre `cadre_slot.png`, "+" affiché dans le médaillon
  (au-dessus du cadre en z-index).
- Bouton retour : nouvelle image, ratio et taille ajustés (50px, 306/337).
- Bouton CHARGER global (bas de liste) : même asset que les boutons par
  carte (`bouton_charger.png`), affiché en plus grand, centré.
- Bandeau "AETHERVALE" en bas de la maquette (Ecran_final.png) **non
  intégré** — décision explicite de Seb, à traiter dans une session future.

## Fichiers modifiés
- `js/ui/title-screen-view.js`
- `css/00-title-screen.css`
- `sw.js` (CACHE_VERSION 3.144.0 → 3.145.0)

## Fichiers ajoutés
- `images/TitleScreen/titre_charger.png`
- `images/TitleScreen/bouton_charger.png`
- `images/TitleScreen/bouton_retour_new.png`
- `images/TitleScreen/bouton_supprimer.png`
- `images/TitleScreen/cadre_slot.png`

## Vérifications effectuées
- `node --check` sur `js/ui/title-screen-view.js` et `sw.js` : OK.
- Accolades CSS équilibrées (56 ouvrantes / 56 fermantes).
- Aucune référence orpheline à `bouton_retour.png` (ancien),
  `btn_charger_base.png`, `carte_active.png`, `carte_inactive.png` dans le
  JS/CSS actif.
- Mesure du médaillon transparent faite par script Python (scan alpha
  pixel par pixel), pas à l'estimation visuelle.
- **Pas de test en rendu réel possible dans cet environnement** (pas
  d'accès réseau pour navigateur headless) — voir `preview_v3.145.0.html`
  ci-dessous.

## À tester par Seb
- `preview_v3.145.0.html` (à placer à la racine du projet, à côté de
  `css/` et `js/`) : mock de 4 héros (Aldric/Lyra/Kael/Maelys, mêmes noms
  que la maquette) avec un petit switcher en haut pour basculer entre
  écran principal et écran Charger.
- Alignement précis du portrait dans le médaillon (peut varier légèrement
  selon la largeur réelle du conteneur — object-fit: cover recadre en
  hauteur).
- Lisibilité du texte des cartes (couleur foncée sur fond parchemin clair).
- Espace disponible pour le bouton Charger + poubelle à droite sur les
  petits écrans (320px) — zone la plus dense du layout.

## Notes / dette
- Bandeau logo "AETHERVALE" en bas de l'écran Charger : pas intégré (choix
  de Seb), à faire dans une prochaine session si souhaité — `titre_logo.png`
  déjà disponible en réduction possible.
- Anciens fichiers (`bouton_retour.png`, `btn_charger_base.png`,
  `carte_active.png`, `carte_inactive.png`) toujours sur disque mais
  déréférencés depuis v3.144.0/v3.145.0 — à nettoyer si confirmé inutile.
