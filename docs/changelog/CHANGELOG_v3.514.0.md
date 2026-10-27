# v3.514.0 — Les tutoriels de l'Équipement et des Talents s'ouvrent enfin

Décision de Seb du 27/10 (option B), après le test des fenêtres de quêtes (`tools/audit/fenetres-quetes.js`).

## Ce qui change en jeu
- 8 tutoriels d'étape ne s'ouvraient jamais depuis v3.244.0 (Équipement et Talents rangés dans Héros) : forest_11 « Les Talents », desert_13 « Le palier », ruines_09 « Le premier palier », ruines_13 « Le palier Rare », crypte_09 « Le palier Rare », crypte_13 « Le palier Épique », montagne_09 « Le palier Épique », montagne_13 « L'Épique complet ».
- Ils s'ouvrent maintenant à l'arrivée sur l'Équipement ou les Talents, par le bouton de la quête comme par Héros. Ceux des étapes déjà passées restent dans Bibliothèque › Tutoriels.

## Test des fenêtres de quêtes (Chromium, 390 px, Histoire complète)
- 95 étapes : fenêtres de fin 95/95 (titre, texte selon le choix, dialogue d'arrivée), dialogues d'ouverture 82/82, tutoriels d'étape 53/53 (45 avant), aucun avant l'acceptation, aucun superposé à une carte de boss, 0 erreur JavaScript.
- Hors de portée du test (ils s'ouvrent pendant l'activité) : Terrain d'entraînement, Petite aventure, Labyrinthe, Grimoire.

## Code
- `ui/ui-root.js` : `switchTab` cherche aussi le tutoriel sous le nom demandé (« equip », « talents »).
- `ui/heros-view.js` : `setHerosSubTab` le cherche à l'ouverture de ces deux sous-onglets.
- Harnais [335]. Aucun fichier ajouté, aucun fichier protégé, contenu des tutoriels inchangé.
