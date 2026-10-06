# Aethervale v3.422.0 — Points ouverts et retours de test du 01/10

Décisions de Seb du 01/10/2026 (soir). S'applique sur la v3.421.0.

## Bugs corrigés
- **Compagnons absents du premier combat.** Le groupe n'était refait qu'à l'apparition d'un ennemi. Si l'ennemi suivant était déjà là, le compagnon manquait au combat suivant. C'était le cas quand Maddoc ou Wenna rejoint, quand un compagnon rentre de patrouille ou est rappelé, ou quand on le remet « présent ». Désormais, le groupe se met à jour tout de suite, combat en cours compris. Les compagnons déjà engagés gardent leurs recharges. `CompanionManager.refreshParty()` est appelé par `unlock`, `setPresent` et `PatrolManager._refresh`.
- **Bonus de carte vivante sur la production.** L'Étang aux roseaux (Puits +10 %) et l'Arbre doré (Scierie +10 %) étaient **affichés mais jamais produits** depuis la v3.97.0. Le bonus est maintenant porté par chaque zone (`getPlotRatePerMin`) et compté une seule fois dans le total.
- **Raccourcis clavier du combat (régression).** Les garde-fous de la v3.287.0 avaient disparu. Ils sont remis :
  - une touche maintenue ne répète plus l'attaque ;
  - le clavier ne joue plus le combat quand une feuille ou une fenêtre est ouverte (`isCombatSheetOpen`) ;
  - la pastille « Espace » est revenue sur le coin du bouton Attaquer, seulement avec une souris.

  Harnais [85] réactivé : `runh.sh` n'a plus à le neutraliser. La deuxième section [85] devient [85 bis].

- **iPhone : vide sous le cadre du Camp et du Village.** La zone sûre du bas (environ 34 px) était comptée deux fois : par la barre du bas et par le panneau. Les écrans en sous-onglets (Quêtes, Héros) l'annulaient déjà, ce qui explique qu'ils n'avaient pas l'écart. Elle n'est plus portée que par la barre du bas (`#panel-container`, `css/02-layout.css`). Reproduit en simulation : 36 px de vide avant, 2 px après.

## Améliorations
- **Débit dans la fenêtre d'une zone.** Une ligne « Débit : 0,56 Blé/min » est toujours visible, aussi au niveau max. Elle compte le bonus de carte. Sous 1/min, le débit garde deux décimales (0,28 et 0,35 s'affichaient tous deux 0,3).
- **Grimoire : « ↩ Revenir au combat ».** Ouvert depuis l'encart « avant le combat », le Grimoire garde le chemin du retour. Le bouton rouvre la même fenêtre : introduction de quête, de chasse, feuille du Donjon, écran « Avant de partir » ou élite de la carte vivante. Le retour est oublié dès qu'on va ailleurs.
- **Bandeau du haut** :
  - l'or est seul, la ressource de la carte du monde est retirée ;
  - le liseré doré des Hauts faits ne recouvre plus le niveau. Il est retiré du portrait du bandeau et garde sa place sur le mini-héros du combat ;
  - le badge de niveau passe devant le cadre.
- **Mode PC** : la barre de défilement des pages (Production, et toutes les pages) passe à la largeur normale, environ le double. Les petites listes internes restent fines.

## Points ouverts traités
- **Pools des secteurs (option A).** Une Petite Aventure lancée depuis un secteur tire ses obstacles **3 fois sur 4** dans le pool du lieu (`pools.obstacle`), sinon dans celui du monde (`Pa2Run._obstaclePool`). Les `pools.combat` sont retirés (6 secteurs) : les combats restent ceux de `PA2_FOES`, réglés par acte.
- **`SCENE_NODES.combatGroups` retiré**, avec ses 7 textes anglais. `traversee-bench.js` porte la nuée de scarabées en local.
- **Bancs périmés retirés** : `sim/village-economy-bench.js` et `sim/desert-pa-combat-bench.js` (ancien moteur v1).
- **`i18n-pseudo-scan.js`** : l'écran « aventure » joue une PA v2 (préparation, départ, deux pas). Les gabarits imbriqués ne sont plus comptés comme textes nus.
- **Libellés Puissance / Précision / Endurance** des PA v2 : ils sont traduits à l'affichage (`sceneStatLabel`), et non plus figés au chargement.
- **Audit i18n** : les écrans Admin, bac à sable et débogage sont exclus de l'estimation « texte en dur » (~100 textes, comptés à part). Il reste ~56 textes estimés sur les écrans du joueur, surtout des faux positifs.
- **`generate-balance-guide.js`** (ma copie) : la table des groupes de Petite Aventure est retirée. **À faire aussi dans ta version**, sinon le générateur plantera sur `SCENE_NODES.combatGroups`.

## Fichiers protégés
Aucun.

## Harnais
- Nouvelle section **[193]** (20 contrôles). Sections [57], [83], [99] et [167] adaptées au retrait de `combatGroups`, [169] au bandeau.
- `parcours-harness.js` P7 : nouvelle graine. Le pool du secteur consomme un tirage de plus, l'ancienne graine ne ramassait plus d'or.

Résultats : round **3 773 OK**, [85] compris, sans neutralisation. Boot 4, création 44, parcours **139**, campagne 38, i18n **100 % (3 751 textes)**, 0 orphelin.
