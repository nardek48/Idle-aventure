# v3.105.0 — Attaques à distance : rounds d'approche

## Mécanique (design gelé)

Face à un héros **à distance** (Rôdeur/arc, Mage/magie), l'ennemi met des rounds à arriver au contact.
Pendant l'approche, il **ne frappe pas** — mais il n'est pas inerte :

- **sa jauge de célérité se remplit** à chaque round d'approche : il arrive « lancé », avec une menace de double frappe au contact ;
- **ses compte à rebours de pattern tournent** : un télégraphe (charge, bouclier, silence) peut tomber pendant l'approche, et son impact se résout normalement ;
- **l'impact de charge le porte au contact** d'un coup (distance fermée).

Le **Chevalier** (épée) est toujours au contact direct : strictement rien ne change pour lui.
Aucune pénalité côté héros : les attaques et compétences font 100 % de leurs dégâts pendant l'approche (décision — la simulation a montré un effet quasi nul, le vrai levier est la frappe évitée).

### Table d'approche (rounds avant contact, héros à distance)

| Ennemi | Rounds | Justification |
|---|---|---|
| Araignée venimeuse | 0 | crache à distance |
| Gobelin | 0 | frondeur |
| Ronce animée | 0 | lianes-fouets |
| Slime, Loup (et tout ennemi absent de la table) | 1 | défaut |
| Troll des forêts | 2 | lourd et lent |
| Boss (tous) | 1 | présence, sans être triviale |

## Équilibrage (validé par simulation Monte-Carlo, 400 runs/cellule, coefficients V1)

- **Rôdeur réparé** (point faible structurel depuis P1) : Cœur Acte III 78 % → **100 %** de réussite, PV au boss 37 % → 46 %.
- **Mage** : confort en potions (1,0–1,2 utilisée par sortie), PV au boss 46–49 %.
- **Chevalier** : identique au dixième près partout.
- Les trois classes convergent à ~43–49 % PV au boss sur Lisière nue et Cœur Acte III.
- Résidus assumés : contrôle artificiel « Cœur nu » du Mage à 61 % ; sorties courtes très confortables pour le Mage (missions d'intro d'Acte I).

## Fichiers modifiés

- `js/data/enemy-archetypes.js` — table `ENEMY_ENGAGE_ROUNDS`, constantes `ENGAGE_DEFAULT_ROUNDS`/`ENGAGE_BOSS_ROUNDS`, helper pur `getEnemyEngageRounds(enemyId, isBoss)`.
- `js/systems/combat-engine.js` *(protégé — scope validé)* — 3 retouches : `prepareEnemy` initialise `engageIn` selon l'arme du héros ; `enemyTurn` joue le round d'approche (pas de frappe, jauge remplie, compteurs actifs, log 👣) ; `resolveEnemyCharge` ferme la distance.
- `js/ui/combat-view.js` — icône de statut « approche » (👣 + rounds restants) en tête de la barre ennemie.
- `css/03-combat.css` — style `.enemy-status-approaching` (teinte terre, statut calme — pas un danger imminent).
- `js/sim/combat-round-sim.js` — parité moteur : config `engageEnabled`/`engageDefaultRounds`/`engageBossRounds`/`engageTable`, héros `ranged`, tour d'approche, charge = contact, `duelBudget` (RPM décalé des rounds d'approche, RPT inchangé).
- `js/ui/combat-round-sandbox-view.js` — le bac à sable injecte la table d'approche réelle du jeu.
- `sw.js` — `CACHE_VERSION` 3.105.0.

## Sauvegarde

Aucun impact : `engageIn` vit sur `game.enemy`, remis à `null` au chargement (l'ennemi est régénéré). Les 4 emplacements sont intouchés.

## Tests

Harnais VM étendu (`round-harness_v3.105.0.js`) : **256 assertions, 0 échec, stable sur 10 runs.**
Nouvelles sections : [46] table d'approche, Chevalier au contact, round d'approche sans frappe (jauge remplie, compteurs actifs) ; [47] charge = contact, statut UI, parité simulateur (RPM +1/+2, Chevalier strictement inchangé).
