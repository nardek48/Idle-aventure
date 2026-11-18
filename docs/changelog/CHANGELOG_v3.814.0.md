# v3.814.0 — Alpha : ce que note le carnet, « Quoi de neuf » réservé à l'Alpha (18/11/2026)

Lot D′ de l'audit de sortie de l'Alpha (`Aethervale_Audit_Alpha_Registre_2026-11-18.md`), demandé par Seb le 18/11. Aucun fichier protégé modifié, aucun changement de sauvegarde, aucun fichier ajouté.

## ALPHA-CONT-1 — « Quoi de neuf » en Alpha
- `core/edition.js` : `ALPHA_NEWS_FROM = "3.813.0"`, la première version envoyée aux testeurs.
- `ui/news-view.js` : en édition Alpha, `newsEntries()` ne garde que les versions à partir de `ALPHA_NEWS_FROM`. Les 236 nouveautés de développement, dont plusieurs parlent des mondes suivants et des boss de fin, ne sont plus montrées aux testeurs. L'édition jeu garde toute la liste.

## ALPHA-DATA-1 (et ALPHA-RET-1) — information sur le carnet (`ui/alpha-view.js`, `lang/en.js`)
- L'intro « Avant de partir » dit aussi « et l'heure de chaque ligne ».
- « Rien de personnel, ni nom ni adresse », trop absolu, devient : « Ni le nom de ton héros, ni rien sur ton appareil. Le carnet reste ici ; c'est toi qui choisis de l'envoyer, à la fin ou quand tu veux depuis Paramètres › Appareil, où tu peux aussi le fermer. » La phrase dit aussi que l'envoi est possible à tout moment ; les décisions closes (envoi et avis à la fin) ne sont pas rouvertes.
- Sous le champ libre de l'avis : « N'écris ni ton nom ni ton adresse. »

## Mesures (copie publiée Alpha, Chromium)
- « Avant de partir » à 320×568 et 390×844, en FR et EN : rien ne déborde, « D'accord » et « Ne pas enregistrer » sont touchables. Étape d'avis : la consigne s'affiche sous le champ libre. 0 erreur de console.
- « Quoi de neuf » en Alpha : 3 lignes (3.814.0 et 3.813.0) sur 239.

## Contrôles
- `round-harness` : 7 164 OK, 0 échec, sur 2 passes ([523] : en Alpha, Quoi de neuf démarre à `ALPHA_NEWS_FROM` et le jeu garde toute la liste ; textes de l'intro et du champ libre).
- boot 4 OK ; création du héros 46 OK ; boot sur la copie publiée Alpha 4 OK ; i18n 100 % (9 125 textes, 0 orphelin).
- Quoi de neuf : une ligne (FR + EN).

## À faire à chaque nouvelle Alpha
- Rien à changer pour les versions suivantes : elles sont au-dessus du plancher. `ALPHA_NEWS_FROM` ne bouge que si l'on veut repartir d'une liste vide pour une nouvelle vague de testeurs.
