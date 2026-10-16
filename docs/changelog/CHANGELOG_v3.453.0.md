# Aethervale v3.453.0 — Voie du Commandement et Mémoire 9 à 16

Décisions de Seb du 16/10/2026, vérifiées en atelier (`atelier/talents-commandement.html`, `atelier/memoire-garder-donner.html`). S'applique sur la v3.452.0.

## La voie du Commandement (talents)
Une voie **commune aux trois classes**, ouverte quand la Crypte est atteinte. Cinq nœuds appris dans l'ordre ; les points sont **partagés** avec l'arbre de classe.
1. **Serrez les rangs** : compagnons +8 % de PV.
2. **À mon signal** : compagnons +10 % de dégâts.
3. **Une charge de plus** : +1 charge aux compétences à charges (Wenna 4 soins, Ysolt 2).
4. **Personne ne reste à terre** : un compagnon tombé revient avec 50 % de ses PV (au lieu de 30 % ; la Fidélité de Mémoire garde 100 %).
5. **Relais** (clé) : quand un compagnon utilise sa compétence, la prochaine attaque de base du héros fait +40 %.

Écran : sélecteur « [Classe] · Commandement » en haut de Héros › Talents, colonne de cinq nœuds, fiche dessous. Fermé (grisé, « s'ouvre à la Crypte ») avant.
Plafond de talents : Crypte acte I **13 → 15** (13 → 18 sur le monde ; les entrées des actes II et III viendront avec leurs étapes).

## La Mémoire, niveaux 9 à 16 (Ruines, Crypte)
Chaque niveau oppose **Garder** à **Donner** (marque sur l'option). Au jalon (12, 16), une **ligne** s'ouvre si les trois niveaux d'avant du monde sont du même côté ; grisée avec sa condition sinon. Si une reprise casse la ligne, son effet s'éteint et le jalon se rechoisit **sans frais**.

| Niv. | Garder | Donner |
|---|---|---|
| 9 | Fiole de réserve | Achever net (voir ci-dessous) |
| 10 | Craie épaisse | Pierre de plus |
| 11 | Fidélité d'Edda | Trait sûr |
| 12 | Clé économe · ligne *Ce qui reste* | Taille rapide · ligne *Tout ou rien* |
| 13 | Sommeil lourd | Réveil brutal |
| 14 | Mèche longue | Cire chaude |
| 15 | Fidélité d'Ysolt | Pas encore, encore |
| 16 | Main offrante · ligne *Personne ne se lève* | Le butin des morts · ligne *Rien ne dort pour rien* |

**À trancher par Seb — Achever net** : l'effet validé (« un ennemi à terre prend 50 % de dégâts en plus ») ne fait rien, un ennemi à terre n'a qu'1 PV et tombe au premier coup. Remplacé, à valider : **un ennemi qui se relève ne revient qu'avec 25 % de ses PV au lieu de 50 %**.
**Mèche longue** et **Cire chaude** attendent la Petite Aventure de la Crypte (acte II) : définies, sans effet d'ici là (Cire chaude s'y branchera seule).

Coûts (règle O16, `offrande-bench.js`, N = 14 runs du donjon du monde) : Ruines **35 / 44 / 52 / 62**, Crypte **77 / 99 / 116 / 138** (provisoire : seul l'acte I existe).

## Mesures
`crypte-acte1-bench.js --cmd 2` (20 runs, sans potion) : avec les deux premiers nœuds du Commandement, les PV restants bougent de 0 à 2 points sur les trois cas ; réglage de l'acte I gardé.

## Code
- `js/data/talent-trees.js` (`TALENT_COMMAND`), `js/systems/talent-system.js` (nœuds `command`, ouverture, ordre, Relais), `js/data/world-caps.js` (plafond 15).
- `js/systems/companion-system.js` : PV et dégâts (`statsOf`), charges, retour après KO, Relais, Trait sûr, Pas encore encore.
- `js/data/memory.js` (niveaux 9 à 16, `MEMORY_VALUES`), `js/systems/memory-system.js` (côtés, ligne, ligne cassée, Main offrante).
- Crochets : `rise-system.js`, `pa2-run.js` + `pa2-content.js`, `forge-system.js`, `village-building-system.js`, `workshops-system.js`, `sortie-system.js` (`fleeKeepPct`), `sleep-system.js`.
- Écrans : `heros-screens-view.js`, `talents-view.js`, `ascension-view.js`, `combat-view.js` (texte de fuite selon la Mémoire), `equipment-view.js` (valeur d'Offrande) ; CSS `04-panel-heros-screens.css`, `04-panel-aether-shop.css`.
- `js/lang/en.js`, `js/lang/data-fields.js`.
- Aucun fichier ajouté au jeu ; aucun fichier protégé touché (Relais passe par `TalentManager.heroDamageMult`, Réveil brutal par la vulnérabilité déjà lue par `dealDamage`).

## Images à fournir (icône générique en attendant)
- Commandement : `UI/talents/bg_commandement.webp`, `UI/talents/emb_commandement.webp`, `Icons/talents/command/` (`c_serrez_rangs`, `c_mon_signal`, `c_charge_plus`, `c_personne_terre`, `c_relais`).
- Mémoire : 20 icônes `Icons/memory/` (16 options + 4 lignes).

## Contrôles
- `node --check` ; `round-harness` 4337 OK, 0 échec (3 passes), nouvelle section [241] ; boot 4/4, création 44/44, parcours P11 15/15 ; i18n 0 manquant, 0 orphelin.
