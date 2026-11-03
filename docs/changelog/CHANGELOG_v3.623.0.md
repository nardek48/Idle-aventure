# v3.623.0 — Ouvertures de chapitre

Chantier « Ouvertures de chapitre », option A de Seb (02/11/2026) : les quatre chapitres d'un coup, images livrées plus tard.

- Quatre ouvertures (Désert, Ruines, Crypte, Montagne), trois planches chacune, textes validés par Seb dans l'atelier `atelier/ouvertures-chapitres.html` (planche 3 du Désert réécrite par Seb, « les tailler » en Montagne). La dernière ligne est le nom du chapitre, en titre doré.
- Jouée une fois, à la fermeture de la fenêtre de fin de la première étape du monde (desert_01, ruines_01, crypte_01, montagne_01). Une partie déjà plus loin la voit en arrivant dans son prochain monde. Aucun nouvel état sauvegardé.
- « Revoir l'ouverture : … » sous « Revoir le prologue » (Quêtes › Histoire, téléphone et PC), pour chaque chapitre dont l'étape d'arrivée est faite.
- Même composant que le prologue (`PrologueView.playChapter`, paquet de planches générique) : lettre à lettre, « Passer », points de progression. En plus pour les chapitres : « Chapitre N » en tête de la première planche, lent rapprochement de l'image, titre qui se pose plus lentement.
- Images attendues dans `images/Chapitres/<monde>_<n>_<nom>[-wide].webp` (24 fichiers, prompts dans « Images à générer »). Tant qu'elles manquent : fond animé dans la teinte du chapitre, le vrai chemin reste demandé.
- **Nouveau fichier** : `js/data/chapter-openings.js` (index.html et précache de sw.js). Registre i18n `CHAPTER_OPENINGS`, 36 lignes traduites en anglais.
- Harnais [418].
