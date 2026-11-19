# v3.815.0 — Alpha : ce qui est hors de cette version est dit partout (19/11/2026)

Audit de sortie de l'Alpha, ALPHA-FONC-4 et ALPHA-CONT-2 : option B de Seb (19/11). En édition jeu, rien ne change. Aucun fichier protégé modifié, aucun changement de sauvegarde, aucun fichier ajouté.

## Changement
- `systems/alpha-system.js` :
  - `AlphaEdition.isWorldBeyond(index)` : vrai pour un monde après le Désert.
  - `install()` enveloppe `WorldCaps.withPrep` et `WorldCaps.atAct`. En Alpha, « s'ouvre aux Ruines anciennes » et « suite à l'acte II des Ruines anciennes » deviennent « s'ouvre / suite au-delà de cette Alpha ». Sont concernés : Forge, Terrain d'entraînement, Village, zones, paliers et rangs des compagnons, bulle d'or, recettes de l'Apothicaire, fil rouge.
  - `install()` enveloppe aussi `DungeonManager.getShardShopLockText`. Dans la boutique d'Éclats, « Palier : Ossuaire niveau N » devient « Au-delà de cette Alpha ». L'enveloppe est posée depuis `alpha-system.js`, et `dungeon-system.js` n'est pas modifié.
- `ui/map-view.js` : un monde après le Désert a le statut « Hors de cette version Alpha » au lieu de « Verrouillé ». Sur PC, sa fiche dit « Hors de cette version Alpha : la suite viendra. » au lieu de « Ce monde s'ouvre en traversant le précédent. »
- `ui/dungeon-view.js` : les donjons des mondes suivants disent « Hors de cette version Alpha. » au lieu de « Le Sanctuaire est encore scellé. », etc.
- `ui/quests-view.js` : une fois le Désert fini, Quêtes › Histoire commence par une carte « Fin de l'Alpha — Tu as traversé le Désert. La suite de l'Histoire n'est pas dans cette version. », avec « Revoir la fin ▸ », qui rouvre la fenêtre de fin et l'avis.
- `systems/fil-rouge-system.js` : « Après l'Histoire. » devient « Après l'Alpha. » une fois l'Alpha finie.
- `lang/en.js` : 8 textes (« Not in this Alpha version », « beyond this Alpha », « End of the Alpha », « See the ending again »…).

## Mesures (copie publiée Alpha, partie de robot finie au Désert, FR et EN)
- Avant : carte « Verrouillé » (PC : « Ce monde s'ouvre en traversant le précédent. ») ; Histoire vide ; donjons « encore scellé » ; Éclats « Palier : Ossuaire niveau 3/6/10 » ; Forge et Terrain « Suite aux Ruines anciennes » ; Wenna « Paliers 11 à 15 : s'ouvrent aux Ruines anciennes. » ; fil rouge « Après l'Histoire. »
- Après : chacun de ces endroits affiche son nouveau texte. Le Désert et la Forêt ne changent pas (« S'ouvre au Désert oublié », par exemple). 0 erreur de console. Rien ne déborde à 320 et 390 px.
- Reste visible, et dit dans le message aux testeurs : le nom des mondes suivants sur les bandes de la Forge des mondes, les hauts faits et le Bestiaire (option C, non retenue).

## Contrôles
- `round-harness` : 7 169 OK, 0 échec. Section [523] : en Alpha simulée, renvois, carte, boutique d'Éclats et carte de fin ; puis retour à l'édition jeu, où tout est inchangé.
- boot 4 OK ; création du héros 46 OK, aussi sur la copie publiée Alpha ; i18n 100 % (9 134 textes, 0 orphelin).
- Parcours : jeu 236 OK, 0 échec ; copie publiée Alpha 250 OK, 0 échec (P1 à P16).
- Quoi de neuf : une ligne (FR + EN).
