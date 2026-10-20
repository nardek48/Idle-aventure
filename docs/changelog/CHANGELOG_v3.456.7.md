# Aethervale v3.456.7 — L'aperçu des créatures sur la carte principale

Point de la liste de Seb du 19/10/2026 : l'aperçu rapide d'un monde, sur la carte principale, n'affichait pas les nouveaux monstres. Ils doivent apparaître une fois découverts.

## Ce qui change
- **L'aperçu montre toutes les créatures du monde**, comme le Bestiaire : ennemis, élites, boss d'Histoire et boss de donjon.
  - Avant, il ne lisait que les ennemis de base des aventures et un seul boss. La Crypte montrait par exemple 4 morts et le Nécromancien suprême, sans élites.
- **Une créature pas encore rencontrée reste un « ? »**, avec un bord en pointillé : violet pour une élite, rouge pour un boss. Elle prend son portrait une fois vaincue, comme dans le Bestiaire.
- **Un compte s'affiche au-dessus** : « Créatures rencontrées : 4 / 7 ».
- **Le Bâtisseur et le Contremaître sont rangés aux Ruines** dans le Bestiaire et dans l'aperçu. Ils l'étaient dans la Forêt, car le Bâtisseur n'apparaît que dans les quêtes et le Sanctuaire. Les hauts faits « Naturaliste » de la Forêt et des Ruines comptent donc juste.

## Code
- `map-view.js` : `getWorldMonsterList` lit `getBestiaryGroupedByWorld`.
- `bestiary-view.js` : un ennemi hors aventure dit son monde par `worldId`.
- `enemies.js` : `batisseur.worldId`.
- `06-map.css` : styles des pastilles d'élite, des inconnues et du compte.
- `en.js` : 1 texte.

Vérifié en capture à 390 px (Crypte et Ruines). Aucun fichier protégé n'a été touché et aucun fichier n'a été ajouté.
