# Aethervale — v3.77.0

## Overlay de cooldown de l'attaque de base : discret en mode auto

### Contexte
Le bouton d'attaque de base affichait toujours le décompte précis (chiffre + barre de
remplissage) pendant son cooldown, même quand `game.autoSkillsEnabled` est actif (combat
piloté automatiquement, y compris via le Grimoire) — inutile puisque le joueur ne clique pas
lui-même dans ce cas. Quand le joueur désactive ce mode dans Paramètres pour reprendre la
main, il retape lui-même et a besoin du timer complet pour bien caler ses clics — ce
comportement est inchangé.

Critère retenu (précisé avec Seb) : uniquement `game.autoSkillsEnabled`, pas le talent
auto-tap indépendant — un joueur qui a désactivé le mode auto dans Paramètres mais garde le
talent auto-tap actif voit quand même le décompte complet.

### Comportement
- `autoSkillsEnabled = false` (défaut, mode manuel) : overlay inchangé — chiffre + barre de
  remplissage précise, comme avant.
- `autoSkillsEnabled = true` : overlay remplacé par une simple teinte discrète (opacité ~0.22,
  pas de largeur dynamique) sans chiffre ni pourcentage — même principe visuel que
  `.combat-action-btn.auto-mode` déjà utilisé sur les boutons de compétence de classe
  (délégué, pas "verrouillé").
- Le bouton reste cliquable dans les deux cas — comportement de mise en file d'attente du tap
  (`basicAttackPending`) inchangé, aucune logique de cooldown touchée, uniquement l'affichage.
- Re-render immédiat (`renderBasicAttackCooldown()`) au moment où le joueur bascule le toggle
  "Compétences automatiques" dans Paramètres, sinon l'ancien état visuel restait affiché
  jusqu'au tick de cooldown suivant.

## Fichiers modifiés
- `js/ui/combat-view.js` — `buildBasicAttackCooldownOverlayHTML()` (retourne un overlay
  discret sans chiffre en mode auto), `renderBasicAttackCooldown()` (classe `.on-cooldown`
  posée uniquement en mode manuel)
- `js/ui/settings-view.js` — `toggleAutoSkills()` appelle `renderBasicAttackCooldown()`
- `css/03-combat.css` — nouvelle classe `.combat-action-cooldown-fill-auto`
- `sw.js` — `CACHE_VERSION` 3.76.0 → 3.77.0

## Tests effectués
- `node --check` sur les 2 fichiers JS modifiés.
- Harness `vm` isolé sur `buildBasicAttackCooldownOverlayHTML`/`renderBasicAttackCooldown` :
  overlay complet (chiffre + barre) confirmé en mode manuel, overlay discret sans chiffre
  confirmé en mode auto, classe `.on-cooldown` posée uniquement en mode manuel, overlay vide
  dans les deux modes quand aucun cooldown n'est en cours. Tout passe.

## Précision (hors code, suite à discussion)
Confirmé à Seb : les 4 archétypes (Enragé/Corrompu/Vampirique/Blindé) ajoutés au rapport en
v3.76.0 sont dans une section séparée ("Archétypes rencontrés"), distincte de
"dégâts évités"/"soin empêché" qui ne couvrent que les patterns de boss télégraphés
(Charge/Bouclier/Soin) — ce ne sont pas les mêmes chiffres, pas de doublon.
