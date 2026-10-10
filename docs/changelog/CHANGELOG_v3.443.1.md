# Aethervale v3.443.1 — Réserve de contre du Grimoire et objets de combat

Défaut trouvé en répondant à une question de Seb (« comment le Grimoire gère un objet qui fait le même effet qu'une règle ? »).

## Le défaut
Le Grimoire garde de côté la compétence de sa règle de contre prioritaire (elle sort de la priorité par défaut, et ses ressources peuvent être réservées). Cette réserve lisait le trait de l'ennemi sans voir les objets de combat. Avec l'Huile de lame emportée ET une règle « Blindé → Brise-garde » gardée, la règle ne jouait plus (voulu, v3.441.0), mais Brise-garde restait mise de côté pour rien.

## La correction
- `getPrioritaryCounterRule` (`combat-auto-policy-system.js`) ignore une règle dont le trait permanent (Blindé, Enragé, Corrupteur, Vampirique) est tenu par un objet : la compétence revient dans la priorité par défaut.
- Bouclier et Silence ne changent pas : la règle reste la seule à annuler le coup, l'objet ne fait que l'atténuer.
- `CombatItems.holdsCondition(conditionId)` ajouté.

## Contrôles
- `round-harness` : 4 161 OK, 0 échec (3 passes) ; contrôle [218] ajouté.
- `parcours-harness` : 139 OK, 0 échec. Aucun fichier ajouté, aucun fichier protégé modifié.
