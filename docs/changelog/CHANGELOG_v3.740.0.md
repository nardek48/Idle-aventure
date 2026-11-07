# v3.740.0 — Caravane d'essai en 3 minutes (07/11/2026)

Analyse du journal de Seb (Ruines) : ruines_04 faisait attendre 10 minutes la caravane d'essai, sans rien d'autre à faire pour l'étape. Décision B de Seb (07/11).

## Changé
- **Caravane d'essai** (ruines_04, crypte_04) : 3 minutes au lieu de 10 (`CARAVAN_TRIPS.essai.seconds` 600 → 180). Textes des fiches de ruines_04 et crypte_04 et de la progression (`story-quests.js`, protégé : textes seulement, conséquence directe de la décision) et leurs traductions.

## Outils
- **Robot de campagne** : le plafond quotidien de l'Apothicaire sert d'abord aux objets qui neutralisent un trait (Baume froid, Encens amer, Huile de lame, Sel de fer — drapeau `soften` absent), puis aux atténuants, puis aux potions ; places gardées pour les neutralisants conseillés aux quêtes restantes du monde. Campagne `--n 2` : 6/6 au bout, aucun mur ; le Chevalier fabrique son Baume dans les deux parties (stock 0 avant), mais une partie le dépense en donjon avant la Silhouette (point ouvert, outils).

## Contrôles
round-harness 7 139 OK, 0 échec (2 passes ; contrôles [368] de la caravane d'essai adaptés) ; boot ; création du héros ; i18n 0 manquant, 0 orphelin ; parcours 235 OK.
