# v3.615.1 — Correctif : l'écran Équipé

Retour de Seb : sur l'écran Équipé du héros, une fois un emplacement touché, on ne pouvait plus en choisir un autre.

- Cause : `SLOTS.map(slotBtn)` (depuis la v3.530.0). `map` passe l'index de l'emplacement en deuxième argument, et `slotBtn(slot, fn)` le prenait pour l'action du bouton. Le résultat était `onclick="6('boots')"`, une erreur au toucher. Seul le premier emplacement (index 0) gardait l'action par défaut.
- Correctif : `SLOTS.map(function (sl) { return slotBtn(sl); })`.
- Vérifié dans Chromium à taille iPhone : casque, puis bottes, arme, anneau, amulette, chacun se sélectionne.

## Contrôles
- round-harness : 5 800 OK, 0 échec. Nouvelle section [411].
- boot : 4 OK. Création du héros : 44 OK. Parcours : 142 OK.
- i18n : 100 %.
