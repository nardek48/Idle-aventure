# v3.622.0 — La nuit dit vrai dans la Crypte et la Montagne

Chantier « Les jours du monde », option B de Seb (02/11/2026).

- Crypte et Montagne : la nuit ne reprend rien (`noRegress`), mais le réveil, la coulée et la chaleur des veines retombent avec le jour de jeu. L'écran de la nuit, le journal et « Cette nuit » au camp le disent désormais : « Cette nuit, les gisants se sont rendormis : … », « Cette nuit, la lave a refroidi : … », « Cette nuit, la chaleur est retombée : … » (noms des secteurs jusqu'à deux, nombre au-delà). « Rien n'a bougé autour du camp » reste quand c'est vrai.
- `world-day-system.js` : relevé des secteurs hostiles et chauds avant le changement de jour (`_restBefore`), nouvelle sorte de nuit `repos` (`calmed`, `cooled`), aucun nouvel état persistant (champ de `explorationProgression.worldDay.night`).
- 8 phrases traduites en anglais ; ligne « Quoi de neuf ».
- Harnais [417] : Montagne (lave + chaleur, puis chaleur seule, puis calme), Crypte (3 couloirs), traductions.
