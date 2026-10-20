# Aethervale v3.456.5 — L'arme du Cœur grandit ; le Légendaire au-dessus de l'Épique

Décisions de Seb du 19 et 20/10/2026 : l'arme du Cœur doit être plus forte (option A validée), et les Légendaires doivent être plus forts que les Épiques.

## L'arme du Cœur grandit avec le monde
- Sa valeur suit le plancher Épique du monde le plus haut atteint. Elle reste ainsi au niveau du meilleur Rare de ce monde, selon la règle de la v3.456.4.

| Monde le plus haut atteint | Valeur de l'arme du Cœur |
|---|---|
| Ruines | 110 (inchangée) |
| Crypte | **196** (avant : 110, contre 128 à 192 pour une Rare de la Crypte) |
| Montagne | 490 |

- Une Épique tombée dans le même monde reste au moins aussi bonne (196 à 288 dans la Crypte).
- L'arme se met à niveau à l'arrivée dans un monde et au chargement de la partie : les armes déjà possédées suivent.
- Code :
  - `ELITE_UNIQUE_LOOT.arme_coeur.growsWithWorld` ;
  - `EliteManager.grownValue` et `growUniques` ;
  - appels dans `world-travel-system.js` et `boot.js`.

## Le Légendaire commence au plus haut de l'Épique
Quand l'écart devenait trop étroit, le maximum est relevé pour garder la largeur de la fourchette Épique.

| | Avant | Après |
|---|---|---|
| Arme | 59 à 84 | **72 à 95** |
| Armure | 0,10 à 0,13 | **0,105** à 0,13 |
| Bottes | 11 à 19 | **17 à 22** |
| Affixe dégâts plats | 18 à 28 | **22 à 29** |
| Affixe défense | 0,045 à 0,06 | **0,047** à 0,06 |
| Affixe DPS automatique | 5 à 9 | **7** à 9 |
| Affixes or et expérience | +12 à +20 % | **+15** à +20 % |
| Affixe chance de butin | 8 à 14 | **10** à 14 |

Plus aucune fourchette ne chevauche la rareté du dessous ; le harnais le vérifie désormais. Les pièces déjà possédées ne changent pas.

## Contrôles
Harnais : section [247] ajoutée, et le test de l'affixe plat lit maintenant son maximum dans la donnée. 4 437 OK, 0 échec, sur trois passes.

Aucun fichier protégé n'a été touché et aucun fichier n'a été ajouté.
