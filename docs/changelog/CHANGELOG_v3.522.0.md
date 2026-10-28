# v3.522.0 — Journal de test : morts situées, relevés vides, reliques

Décision de Seb du 28/10, après lecture du journal du Désert. Seul `main/journal-test.js` change ; le jeu se joue à l'identique.

## Corrections
- **Morts** : elles étaient vues par le relevé d'une seconde, quand la sortie était déjà close et le héros au Campement. Donjon, quête et carte restaient vides, et l'ennemi était celui d'après (« Scarabée » pour la mort contre le sphinx). La mort est désormais notée au moment où elle tombe : enveloppes de `CombatEngine.onHeroDefeated` (donjon, quête, élite de carte, farm) et de `Pa2Run._hurt` (Petite Aventure : modèle et ennemi du nœud). Un héros relevé par le Seuil ou la Fiole noire n'est pas noté. Le relevé d'une seconde reste en repli, sans doublon.
- **Relevés vides** (`pt 0`, héros vide, 10 PV) : écrits au démarrage, avant le chargement de la sauvegarde. Aucune ligne n'est plus écrite sans héros. Il n'y avait pas de perte de données.
- **Achat d'une relique** : la ligne dit la famille et le monde (`relique`, `monde`, `prix`) au lieu du seul prix.

## Vérifications
- Chromium, 10 contrôles dédiés : mort en donjon (donjon 1, Gobelin), en quête, en Petite Aventure ; Seuil sans mort ; pas de doublon ; relique ; rechargement sans ligne vide.
- round-harness 5307 OK ×3, boot 4 OK, parcours 139 OK, i18n 100 %.
- Aucun fichier ajouté, aucun fichier protégé.
