# v3.526.0 — Images : état réel et contrôle complet (audit, lot 9)

Lot 9 de l'audit du 27/10, sans génération d'images (elle revient à Seb). Rien ne change en jeu, hormis un commentaire.

## Outil
- `tools/audit/missing-icons.js --chromium` (IMA-4) : la passe dans le jeu appelle aussi les constructeurs de chemins (reliques des compagnons, icônes d'équipement par rareté, vignettes et pastilles des mondes, emblèmes des talents), soit 79 chemins.
- Les 6 reliques des compagnons, jusqu'ici invisibles pour l'outil, sont relevées : il liste maintenant les 8 images absentes.

## Documentation
- `Aethervale_Images_a_faire.md` remis à plat (IMA-6), avec la liste exacte :
  - 8 images absentes (6 reliques des compagnons, 2 objets de combat de la Montagne) ;
  - 2 à refaire : halte « Pacte de sang » (mot anglais « Contract »), Spectre errant (fond opaque) ;
  - signalements IMA-5 (images à deux usages, dont l'Affût aménagé sur le bouton « Rentrer » de chaque combat) et IMA-7 (fichiers inutilisés).
- Page de suivi : la source du dépôt (`atelier/images-a-faire.html`) est alignée sur l'Artifact publié (180 entrées, prompts des 8 absentes compris). La relique « Talisman » y est renommée « Emblème », son nom depuis v3.512.0.
- `ui/pa2-view.js` : le commentaire « à générer » de `node_vein` est retiré (image livrée).

## Mesuré, en attente de décision : poids des portraits (IMA-2)
- En combat, le portrait d'un ennemi s'affiche sur 345 px CSS à 430 px de large, soit environ 1 035 px réels à @3x, et sur 489 px sur PC (Chromium, sauvegarde du Désert).
- Le ré-export à 768 px recommandé par l'audit rendrait les portraits flous en combat : il est écarté.
- Options remises à Seb :
  - ramener les 13 portraits de 1254 px à 1024 px (−2,76 Mo) ;
  - créer des vignettes de 128 px pour le bestiaire et la carte (339 Ko pour les 52).

## Contrôles
- Round : 5 333 OK, 0 échec, sur deux passes.
- Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- i18n : 6 583 textes, 100 %, 0 orphelin.
- Aucun fichier ajouté.
