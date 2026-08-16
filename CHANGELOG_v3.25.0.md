# Aethervale — CHANGELOG v3.25.0

Base : v3.24.0. Phase 1 (mécanique) du système multi-héros — jusqu'à
3 parties entièrement indépendantes, comme discuté. La phase 2
(habillage visuel définitif) suivra une fois que tu as pu tester que
rien ne se mélange entre les héros.

## Ce que c'est

Chaque "héros" est maintenant une sauvegarde complète et autonome — or,
essence, Aether, ascension, position sur la carte, quêtes, Village,
Donjon, hauts faits, Codex, afflictions, inventaire, équipement, talents,
niveau : absolument tout, pas seulement les stats du personnage.
"Switcher" de héros = charger une autre partie en entier ; l'ancienne
reste figée telle quelle jusqu'à ce qu'on y revienne. Maximum 3
emplacements.

## Ta partie actuelle ne bouge pas

Migration automatique et silencieuse au premier chargement après cette
mise à jour : ta sauvegarde actuelle devient l'"Emplacement 1" — aucune
action requise de ta part, rien n'est perdu.

## Ce qui change dans l'onglet Héros

Le bouton "héros suivant" (carrousel des 6 héros) est remplacé par 3
cases :
- Occupée : portrait, nom, niveau du héros de cet emplacement — taper
  dessus bascule vers cette partie (avec confirmation, changement de
  partie complet).
- Vide : "+ Nouveau héros" — ouvre le flux de création qu'on a refait
  ensemble (nom → héros), démarre une toute nouvelle partie à zéro dans
  cet emplacement.

Le reste de l'onglet Personnage (fiche/amélioration/stats) est
strictement inchangé.

Phase 1 = mécanique d'abord : le style des 3 cases réutilise les classes
déjà existantes du carrousel, pas encore l'habillage visuel dédié qu'on
affinera ensuite une fois que t'as pu jouer avec.

## Comment c'est construit (pour référence)

Chaque emplacement a sa propre clé de sauvegarde (`quest_idle_save_v6_slot1/2/3`
au lieu d'une seule clé fixe), plus une petite clé séparée qui retient
quel emplacement est actif. Le plus important : `saveGame()`/`loadGame()`
n'ont pas changé de signature — seul ce que représente "la sauvegarde"
est devenu dynamique. Les dizaines d'appels déjà répartis dans tout le
code n'ont eu besoin d'aucune modification.

Nouveau `HeroSlotManager` (systems/save-system.js) : `switchToSlot()`
sauvegarde l'emplacement qu'on quitte avant de charger le suivant ;
`createHeroInSlot()` repart d'un état 100% neuf ; `deleteSlot()` existe
déjà (pas encore branché à un bouton dans l'UI — prévu pour la phase 2,
mécanique déjà prête et testée).

## Bug trouvé et corrigé en testant

Le premier jet du "wipe and reset" effaçait par erreur
`game.saveSupported` (détection de compatibilité localStorage faite une
fois au tout premier lancement) — `saveGame()` se mettait à échouer
silencieusement juste après la création d'un 2e ou 3e héros, sans aucune
erreur visible. Trouvé par le harnais de test dédié (vraie isolation des
données vérifiée, pas juste "le code s'exécute"), corrigé avant livraison.

## Tests effectués

- `node --check` sur les 2 fichiers touchés.
- Harnais dédié (26 assertions) simulant un vrai localStorage persistant
  entre les appels : migration de l'ancienne sauvegarde (une seule fois) ;
  création de 3 héros avec des données très différentes ; isolation
  totale vérifiée à chaque bascule (revenir sur un héros redonne
  exactement ses données) ; modification en cours bien sauvegardée avant
  de switcher ; refus d'un 4e héros ; suppression d'un emplacement sans
  affecter les 2 autres.
- Re-passage des 11 harnais de non-régression existants : aucune
  régression.
- Playwright (rendu réel, 390×844, vrai flux navigateur de bout en
  bout) : création héros 1 (Aldric, 5000 or) → 3 cases confirmées ;
  création héros 2 (Lyra, Mage) via le vrai bouton "+ Nouveau héros" →
  `activeSlot=2`, or repart bien à 0 ; bascule vers l'Emplacement 1 →
  Aldric ET ses 5000 or reviennent exactement, toast affiché,
  redirection Campement. Aucune erreur console liée au correctif, aucun
  nouveau 404.

## Fichiers modifiés

- `js/systems/save-system.js`
- `js/ui/heros-view.js`
- `css/04-panel-hero-summary.css`
- `sw.js` (`CACHE_VERSION` → `"3.25.0"`)
