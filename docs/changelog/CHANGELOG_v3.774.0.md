# v3.774.0 — La variante du Chaos s'ouvre à la fin de l'Histoire (12/11/2026)

Décision de Seb (12/11, option A) : la variante du Chaos n'est plus proposée dès la première création. Elle s'ouvre quand un héros a fini l'Histoire (fin de la Tour). Aucun fichier ajouté, aucun fichier protégé touché.

## Ce qui change
- **Création du héros** (`js/ui/modal-view.js`) :
  - la case « Variante du Chaos » n'apparaît qu'une fois la variante ouverte (`isChaosUnlocked`), et la bascule ne fait rien tant qu'elle est fermée ;
  - un héros du Chaos en cours de recréation garde sa case.
- **Déblocage noté sur l'appareil** : préférence `chaosUnlocked` (`prefs-system.js`), car chaque héros est un emplacement séparé. Elle est posée :
  - par la fenêtre de fin de l'Histoire ;
  - par la carte de fin dans Quêtes › Histoire, ce qui couvre les parties déjà finies (`noteChaosUnlock`, `quests-view.js`).
  `save-system.js` n'est pas touché.
- **Fenêtre de fin de l'Histoire** : une ligne annonce la variante (« Nouveau : … » la première fois, puis un rappel).
- **Tutoriel `chaos_variant`** : le troisième point dit quand elle s'ouvre (FR et EN).
- **Héros du Chaos déjà créés** : inchangés.
- **Alpha** : l'Histoire s'y arrête après desert_18, la variante n'y apparaît donc pas.

## Contrôles
- `round-harness` 7308 OK, 0 échec ; nouveau contrôle [521] (fermée, ouverte à la fin de la Tour, reste ouverte).
- `hero-creation-harness` 46 OK : case absente au départ, bascule sans effet, puis parcours complet une fois ouverte.
- boot 4 OK ; parcours complet 239 OK ; i18n 100 %.
- Quoi de neuf : une ligne (FR + EN).
