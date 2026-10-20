# Aethervale v3.456.6 — Hauts faits des Ruines et de la Crypte

Décision de Seb du 20/10/2026 : la liste proposée est mise en place. Chaque monde a 10 hauts faits, dont 2 cachés, et des paliers bronze, argent et or à 3, 6 et 8 hauts faits, comme au Désert.

## Ruines (1 500 or chacun, 3 000 pour les cachés)
- **Paliers** : 4 500, puis 11 250, puis 2 250 or avec le titre **« Qui lit les murs »**.
- Le plan fait pierre : vaincre le Maître d'œuvre.
- Le garde scellé : vaincre Varrek.
- Les murs reculent : toute la carte libérée en même temps.
- Les marques des Ruines : le Contremaître et le Golem.
- Le Golem, encore : 10 fois.
- Le mur d'en haut : Palissade 8.
- Une rue qui tourne : une Petite Aventure des Ruines jusqu'au bout.
- Naturaliste des Ruines.
- *Caché* — Pas une pierre de trop : le Maître d'œuvre sans potion.
- *Caché* — Ce qui retombe se relève : un quartier repris par la cité, libéré à nouveau.

## Crypte (3 000 or chacun, 6 000 pour les cachés)
- **Paliers** : 9 000, puis 22 500, puis 4 500 or avec le titre **« Qui laisse dormir les morts »**.
- Celui qui retient : vaincre le Nécromancien suprême.
- Les os en ordre : vaincre la Liche des sépulcres.
- Tous les couloirs : toute la carte libérée en même temps.
- Les marques de la Crypte : le Porte-couronne et la Pleureuse.
- Laisse-les dormir : 100 morts laissés.
- Ceux qu'on réveille : 50 morts réveillés puis vaincus.
- Une lampe dans le noir : une Petite Aventure de la Crypte jusqu'au bout.
- Naturaliste de la Crypte.
- *Caché* — Personne ne reste : le Nécromancien suprême sans qu'aucune chaîne tienne ses 2 rounds.
- *Caché* — Le réveil, repris : reprendre un couloir resté hostile.

## Notes
- Les titres proposés (« Celle qui lit les murs », « Celui qui laisse dormir ») sont devenus neutres, selon la règle des textes adressés au héros.
- Les compteurs neufs démarrent à zéro, sans rattrapage, comme ceux du Désert. Les hauts faits lus dans l'état (boss, carte, élites, bestiaire, Palissade) sont acquis d'office pour une partie déjà avancée.
- **Icônes** : il en faut 20, à `images/Icons/achivement/<id>.png`. L'icône générique s'affiche d'ici là. `missing-icons.js` ne les voit pas, car le chemin est construit à partir de l'identifiant.

## Code
- `achievements.js` : 20 hauts faits, 2 catégories, et l'aide `storyAdvDoneAch`.
- `achievement-system.js` : compteurs « sans potion » (Maître d'œuvre), morts réveillés puis vaincus, Nécromancien suprême sans chaîne tenue, Petites Aventures des Ruines et de la Crypte, quartier repris aux Ruines.
- `sleep-system.js` : morts laissés, chaîne tenue jusqu'au bout.
- `living-map-system.js` : « Le réveil » repris.
- `en.js` : 45 textes.
- Harnais : section [248] ajoutée, catalogue passé à 64 hauts faits. 4 443 OK, 0 échec.

Aucun fichier protégé n'a été touché et aucun fichier n'a été ajouté.
