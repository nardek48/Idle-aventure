# v3.500.0 — Audit d'équilibrage, P4 : une relique dès la première patrouille

Décision de Seb du 26/10 (audit `equilibrage/Aethervale_Audit_Equilibrage_Heros_v3_498_0.html`, P4 option a).

## Ce qui change en jeu
- La **première patrouille terminée** rapporte toujours une relique, du monde de la patrouille, famille au hasard. Le joueur découvre les emplacements dès le palier 5 d'entraînement.
- Ensuite, rien ne change : 4 % par heure de patrouille, une garantie toutes les 24 h cumulées. Un rappel anticipé ne rapporte toujours rien.
- Partie en cours : un joueur qui n'a encore aucune relique en reçoit une à sa prochaine patrouille terminée.

## Pourquoi
Les campagnes de l'audit ne trouvaient que 2 à 3 reliques pendant toute l'Histoire, de rang bas, sans effet mesurable : le système ne se faisait pas sentir avant la fin.

## Code
- `systems/companion-relic-system.js` : `rollPatrol` garantit la relique tant que `game.companionRelics.next` vaut 1 (aucune relique jamais trouvée). Aucun nouvel état sauvegardé.
- `round-harness.js` : section [327], un contrôle de plus.
- Aucun fichier ajouté, aucun fichier protégé.
