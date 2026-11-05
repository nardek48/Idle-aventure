# v3.674.0 — Le 20 et le 1 naturels se voient

Atelier `atelier/de-d20.html`, variante B validée par Seb (04/11).

- **20 naturel** : le chiffre éclate (grossit puis se pose), un anneau doré pulse deux fois, des rayons d'or tournent autour du dé, dix étincelles jaillissent ; petite vibration.
- **1 naturel** : le dé tremble, un éclair rouge passe autour, une fêlure se dessine sur la face, le chiffre penche et tombe un peu, le dé s'assombrit ; vibration plus longue.
- Les effets ne jouent qu'à la pose du dé (`is-fx20` / `is-fx1` posées par `pa2RollDie`), pas quand la feuille se redessine. Anneaux transparents au centre : le dé reste net.
- `js/ui/pa2-view.js` (`PA2_DIE_FX`, `pa2RollDie`), `css/04-panel-pa2.css`.

Contrôles : round 6 140 OK (2 passes), boot 4 OK, parcours 212 OK.
