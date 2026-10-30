# v3.580.0 — Petites Aventures, lot 4 : l'objet de la nuit

Choix A de Seb (30/10). Constat : la besace a 6 places, la préparation habituelle (ration, corde, gourde, trousse) en prend 5, et ces objets sont gratuits : rien ne pousse à changer. La condition de la nuit (v3.469.0) conseillait déjà un objet, mais seulement dans une ligne grise, sans effet.

## La règle
- L'objet conseillé par la nuit est **renforcé pour le run** s'il est dans la besace :
  - objet à usages (corde, gourde, trousse, craie, pierre froide, outre) : **+1 usage** ;
  - **torche** : sa lumière n'attire rien, donc pas de +15 % de dégâts en combat ;
  - **armure** : pas de Souffle en plus sur les obstacles.
- Nuit calme, ou nuit sans conseil : aucun renfort.
- L'usage offert ne revient pas à l'Entrepôt : une outre de la nuit non bue rend au plus ce qui a été prélevé.

## Affichage
- Préparation : le panneau « Cette nuit » met l'objet en avant (« ★ Cette nuit : Trousse de crocheteur · Un usage de plus. »).
- Liste des objets : « ★ cette nuit » et le renfort, en doré.
- Besace : l'objet de la nuit a un liseré doré et une étoile.

## Banc (`tools/sim/pa2-bench.js`, 200 runs, besace fixe du robot)
| Anneau | KO avec | KO sans (`--sans-nuit`) | Or avec / sans |
|---|---|---|---|
| Chemin | 8 % | 9 % | 284 / 282 |
| Périple | 18 % | 19 % | 373 / 367 |

Un coup de pouce discret, qui ne déséquilibre rien. Le robot ne change pas sa besace selon la nuit ; un joueur qui suit le conseil en tire plus.

## Code
- `js/systems/pa2-run.js` : `nightItem`, `nightBoost` ; +1 usage au départ ; torche et armure sans leur défaut ; retour à l'Entrepôt plafonné à ce qui a été pris.
- `js/ui/pa2-view.js`, `css/04-panel-pa2.css` : panneau, liste et case de la besace.
- `js/lang/en.js` : textes anglais ; l'ancienne ligne « Utile cette nuit » retirée.
- Aucun fichier ajouté, aucun fichier protégé, aucun nouvel état.

## Contrôles
`round-harness` 5 569 OK, 0 échec (deux passes ; nouvelle section [384], [283] mis à jour) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` 142 OK ; audit i18n 100 %, 0 orphelin. Préparation vérifiée sous Chromium à 390 × 844.
