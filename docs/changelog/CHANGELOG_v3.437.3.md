# Aethervale v3.437.3 — Forge : la reforge d'Histoire dit ce qu'elle fournit

Bug relevé au rejeu des 4 premières heures. Décision de Seb : bug 5 du rapport, corriger le texte (l'équilibrage ne change pas). S'applique sur la v3.437.2.

## Le constat
- Pour les reforges de l'arme exigées par l'Histoire (niveaux 1 à 4), la fiche de la Forge disait « Matériaux fournis par le village (reforge exigée par l'Histoire) ».
- Le village ne fournit que ses matériaux de base (`STORY_PROVIDED_MATERIALS`) ; dans une reforge, c'est l'acier. La Résine durcie (niveaux 3 et 4) reste due : à 2 → 3, la fiche annonçait des matériaux fournis et affichait « Matériaux manquants ».

## Ce qui change
- Le texte devient « Acier fourni par le village (reforge exigée par l'Histoire) ». La Résine due reste affichée dans le coût, comme avant.
- Aucun coût ne change.

## Code
- `js/ui/village-building-view.js` : texte de la note de reforge.
- `js/lang/en.js` : traduction (« Steel provided by the village… »).
- Aucun fichier ajouté.

## Contrôles
- Chromium (390 × 844), Forge 2, arme reforgée à 2, sans Résine : « Acier fourni par le village (reforge exigée par l'Histoire) », coût 729 or + 1 Résine en rouge, « Matériaux manquants ».
- Round : 4 114 OK, 0 échec, sur deux passes. Boot : 4 OK. i18n : 100 %.
