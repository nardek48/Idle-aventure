# Changelog v3.95.1 — Panneau Parcelles fusionné dans la carte Champs

Ajustement suite au retour de Seb sur la v3.95.0 : le bouton et le panneau "Parcelles et
améliorations" formaient un second cadre visuellement séparé sous la carte Champs. Ils
sont désormais intégrés à l'intérieur de la carte elle-même, sur toute sa largeur, en
dessous des 3 colonnes existantes (portrait/infos/actions).

2 fichiers modifiés, node --check OK. Rendu vérifié via harnais node vm.

---

## js/ui/production-view.js
buildFarmPlotsToggleHTML() est désormais appelée avant la fermeture de .production-card
(et non plus après), enveloppée dans un nouveau bloc .production-card-full-row.

## css/04-panel-production.css
.production-card passe de display: flex (ligne unique) à flex-wrap: wrap, et le
nouveau .production-card-full-row (width: 100%) force le panneau à passer sur sa
propre ligne, à l'intérieur du même cadre — technique flexbox standard, aucun changement
de structure DOM en dehors de ce déplacement.

---

## Réponse à la question sur les héros (pas de code, confirmation)

Un changement de héros en cours de partie (selectHeroInline) ne touche jamais
game.production — vérifié par recherche dans le code. Le système de parcelles des
Champs dépend uniquement du niveau du bâtiment (progression de partie), jamais du
héros actif. Un joueur peut donc toujours améliorer/débloquer des parcelles quel que soit
le héros en cours, et rien ne se réinitialise en changeant de héros. Les niveaux et
parcelles restent aussi conservés à l'ascension, comme les 5 autres bâtiments.

---

## Tests manuels à effectuer

- Écran Production, carte Champs : le bouton "🌾 Parcelles et améliorations" et son
  panneau (une fois déplié) apparaissent maintenant dans le même cadre que le
  portrait/infos/actions — un seul bloc visuel, plus de second cadre séparé en dessous.
- Les 5 autres bâtiments (sans ce bouton) restent inchangés visuellement.
