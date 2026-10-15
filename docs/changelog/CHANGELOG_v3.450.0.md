# Aethervale v3.450.0 — Crypte, lot C-0 : le socle

Premier lot du chapitre IV (Conception Crypte v1.0, plan de lots validé par Seb le 15/10). Rien ne change en jeu tant que le chapitre n'est pas écrit : la Crypte ne s'atteint pas encore. S'applique sur la v3.449.2.

## Ce qui est posé
- **Plafonds du monde 4** (`WORLD_CAPS[3]`), écrits avant d'ouvrir le monde : provisoires, égaux aux Ruines, **3ᵉ rangée de zones ouverte** (CR8). Terrain et points de talent : entrée d'acte I (`crypte_01`), inchangés.
- **Matériaux** : *Cire de sépulcre* (brute) et *Cire consacrée* (raffinée), monde 4. Icônes à générer (icône générique en attendant).
- **Ajustement au héros** : référence `joueurRuines` (fin des Ruines : campagne `--combats --avise`, trois classes, 870 de dégâts par round, 1 615 PV effectifs).
- **Ossuaire** : fermé jusqu'à son contenu (acte III), verrou d'Histoire `crypte_12` déjà déclaré.

## Le passage entre les mondes
- Vérifié de bout en bout (Chromium, taille iPhone) : arrivée par `WorldTravel.arrive("crypt")`, monde de résidence posé et noté atteint, fond de combat de la Crypte, tous les onglets ouverts, sauvegarde rechargée, fenêtre du monde, voyage retour aux Ruines puis aller à la Crypte. Aucune erreur.
- Le canevas de la descente (`traversee_crypte`, avec `travelOnSuccess`) vient avec l'acte I (lot C-2), une fois son texte validé.
- À signaler : la fenêtre du monde affiche le **Nécromancien suprême** comme boss des deux zones de la Crypte ; il sera le boss d'Histoire (CR6).

## Contrôles
- `node --check` ; `round-harness` 4281 OK, 0 échec (3 passes), nouvelle section [238] ; boot 4/4, création 44/44, parcours P11 15/15 ; i18n 0 manquant, 0 orphelin ; `missing-icons` : 8 absentes (6 objets de combat + 2 cires).
- Aucun fichier ajouté. Fichiers protégés : aucun touché (la référence d'ajustement est une donnée de `data/worlds.js`).
