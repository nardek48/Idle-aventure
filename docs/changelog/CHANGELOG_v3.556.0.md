# v3.556.0 — Grand écran, option B (2/5) : la Carte et la fiche du monde

Suite de l'option B (accord de Seb du 29/10, « ok pour la suite »), d'après la maquette `atelier/grand-ecran.html`. Format large seulement : **le téléphone ne change pas**.

## Ce qui change sur grand écran
- **À gauche, la carte du monde entière**, à la hauteur de l'écran (440 × 788 px à 1440 × 900) : plus de défilement pour voir la Tour.
- **À droite, la fiche du monde choisi** (à l'arrivée, celui où tu es) ; toucher un monde sur la carte ou dans la liste le choisit :
  - vignette, nom, état (Tu es ici, Atteint, Verrouillé), aventure en cours ;
  - **Ouvrir la carte vivante** (monde atteint qui en a une) et **Y voyager** (monde atteint, autre que le tien ; refus expliqué au survol) ;
  - cartes : **carte vivante** (secteurs libérés, barre), **Petite aventure** du monde où tu es (avec son bouton, comme au Camp), **donjon** (sorties du jour, Entrer) ;
  - la phrase du Codex, les **créatures rencontrées** (même pastilles qu'au téléphone, la fiche s'ouvre au toucher) ;
  - **Les mondes** : les six, pour passer de l'un à l'autre.
- Un monde verrouillé dit seulement qu'il s'ouvre en traversant le précédent.

## Code
- `js/ui/map-view.js` : `buildMapWideSheetHTML` et `selectMapWorldWide` ; `buildMapHTML` ajoute la fiche au format large ; sur grand écran, `tapMapWorld` choisit le monde au lieu d'ouvrir la fenêtre.
- `css/10-grand-ecran.css` : section « option B, Carte ».
- `js/lang/en.js` : textes anglais. Aucun fichier ajouté, aucun fichier protégé.

## Contrôles
`round-harness` 5 466 OK, 0 échec (deux passes, section [371] ajoutée) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` P11 15 OK. Captures à 1440 × 900 et 1180 × 820 ; téléphone inchangé.
