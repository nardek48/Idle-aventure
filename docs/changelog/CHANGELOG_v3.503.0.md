# v3.503.0 — Grand écran, lots GE-2 et GE-3 : la coque et la Chronique

Accord de Seb du 26/10 (« tu peux faire directement toutes les modifications »), option B du compte rendu grand écran (`systemes/grand-ecran/` du dépôt Documentation, atelier `atelier/grand-ecran.html`). Format large seulement (PC, tablette en paysage) : **le téléphone ne change pas**.

## Ce qui change sur grand écran
| # | Avant | Maintenant |
| --- | --- | --- |
| Fenêtre | 1 180 px de large au plus. | 1 440 px (hauteur de référence 900) : rail, page d'environ 1 000 px, Chronique de 320 px. |
| G11 | Le rail de gauche reprenait les 5 onglets du téléphone ; Hauts faits, Bibliothèque, Journal et Paramètres passaient par le Menu. | Le rail montre Camp, Quêtes, Village, Héros, Carte, puis Hauts faits, Bibliothèque, Journal et Paramètres (entrées plus petites). Le bouton Menu disparaît du rail. |
| G2 | Le bandeau montrait PV, XP, or et deux ressources. | Au centre : le monde en cours et l'étape d'Histoire (« La ville rangée · étape 6 / 20 »). À droite : or, bois, pierre, fer et la matière du monde (survol : nom et plafond de l'entrepôt). |
| G3 | Bulles « à faire » dans le bandeau (lot GE-1). | Elles passent dans la Chronique, en clair, avec leur nombre. |
| GE-3 | — | **Chronique** à droite : objectif d'Histoire (accepté ou non, lien vers Quêtes), « À faire », production du village (stock, débit, Tout récolter) et les 6 dernières lignes du journal. |

## Chronique
- Se replie en bande d'icônes (56 px) sous 1 280 px de fenêtre (iPad 1180 × 820) ; un clic sur une icône l'ouvre par-dessus la page, Échap la referme.
- Le bouton de tête ou la touche **C** la replie ou la rouvre ; le choix est une préférence de l'appareil (`chronique`, hors sauvegarde).
- Cachée pendant un combat, une petite aventure ou une carte vivante (lot GE-5).

## Raccourcis clavier (format large, aucune fenêtre ouverte)
**1** Camp · **2** Quêtes · **3** Village · **4** Héros · **5** Carte (si débloquée) · **C** Chronique.

## Mesures (Chromium, partie avancée aux Ruines)
- 1440 × 900 : rail 94 px (9 entrées, sans défilement), Chronique 310 px, aucune barre horizontale.
- 1366 × 768 et 1180 × 820 : rail sans défilement ; Chronique ouverte à 1366, repliée à 1180.
- Téléphone 390 × 844 : barre du bas inchangée (5 onglets), ni Chronique ni bandeau enrichi, touches sans effet.

## Code
- **Fichiers ajoutés** (dans `index.html` et le précache de `sw.js`) : `css/10-grand-ecran.css`, `js/ui/chronique-view.js`.
- `index.html` : 5 entrées du rail (`tab-wide`), cachées au téléphone (`css/02-layout.css`).
- `js/ui/hud-view.js` : bloc « où j'en suis » et 4 ressources du bandeau (rafraîchis chaque seconde), appel de la Chronique.
- `js/ui/ui-root.js` : `switchTab` allume l'entrée propre de l'onglet quand elle est visible (Carte, Journal… dans le rail).
- `js/ui/hud-dock-view.js` : l'onglet actif est lu dans `game.activeTab`.
- `js/ui/desktop-scale.js` : fenêtre 1 440 × 900. `js/systems/prefs-system.js` : préférence `chronique`.
- `js/lang/en.js` : textes anglais. Aucun fichier protégé.

## Contrôles
`round-harness` 5 182 OK, 0 échec (deux passes ; section [328] ajoutée, contrôle [179] passé à 1 440 px) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` P11 15 OK.
