# Aethervale v3.429.3 — Correctifs : régénération du Campement, départ à 0 PV, tutoriels

Bugs relevés en jouant une partie neuve dans Chromium à taille iPhone, d'un Rôdeur niveau 1 jusqu'à la carte d'Aeswyn. S'applique sur la v3.429.2.

## La régénération du Campement marche app ouverte
- Cause : `applyRegen` est appelé à chaque image par `renderHud`. Le soin d'une image (moins de 1 PV) était arrondi à 0, mais le repère de temps avançait quand même. Résultat : 0 PV régénéré tant que l'app restait ouverte, et le minuteur « Max dans … » restait figé. Mesuré : 3 599 appels en 60 s, 0 PV.
- Correctif : quand le soin arrondit à 0, le repère n'avance pas et le temps s'accumule jusqu'au PV suivant. Mesuré après correctif : +7 PV en 30 s pour 302 PV max (attendu ~7,5).

## Le plafond de 50 % hors ligne s'applique
- Cause : au démarrage, l'apparition de l'ennemi appelait `renderHud`, donc la régénération en ligne, sans plafond. Elle consommait toute l'absence avant l'appel hors ligne. Mesuré : 1 h d'absence, 10 → 400 PV au lieu de 210.
- Correctif : la régénération hors ligne passe juste après le rattrapage de production, avant tout spawn. Mesuré après correctif : 10 → 161 PV pour 302 PV max (attendu 161).

## Plus de départ en quête à 0 PV
- Cause : à 0 PV, l'estimation proposait « Partir quand même » et la quête démarrait. Le héros ne pouvait pas combattre, et ce run actif coupait toute régénération, même hors ligne, jusqu'à « Abandonner ».
- Correctif : `AdventureQuestManager.start` refuse le départ à 0 PV avec le message existant « Tu es à terre — soigne-toi au Campement avant de repartir. »

## Tutoriels : erreurs factuelles
- Terrain d'entraînement : « butent à 10 » → « butent à 20 » (`TRAINING_BASE_CAP`). « Personnage → Stats » → « Héros → Entraînement », aussi sur la fiche du Terrain.
- Amélioration : « Puissance » → « Force », le nom affiché à l'écran.
- Boutique : potion majeure « 400 or » → « 600 or », prix réel depuis la v3.291.0.

## Code
- `js/systems/camp-system.js` : repère conservé quand le soin arrondit à 0.
- `js/main/boot.js` : régénération hors ligne déplacée avant les spawns.
- `js/systems/adventure-quest-system.js` : garde à 0 PV dans `start`.
- `js/ui/tutorial-view.js`, `js/data/story-quests.js`, `js/data/village-buildings.js`, `js/lang/en.js` : textes et clés de traduction.
- `tools/harness/round-harness.js` : le contrôle « potion majeure à 400 or » attend désormais 600 or.
- Aucun fichier protégé touché. Aucun fichier ajouté.

## Contrôles
- Round : **3 963 OK**, 0 échec, sur trois passages.
- Boot : 4 OK. Création du héros : 44 OK.
- i18n : 4 184 textes, 100 %, 0 orphelin.
- Vérification dans Chromium (390×844) des trois correctifs, console sans erreur.
- `node --check` sur tous les fichiers modifiés.
