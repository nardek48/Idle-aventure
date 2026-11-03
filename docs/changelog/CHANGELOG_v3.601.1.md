# v3.601.1 — Sujets de conversation : icônes dédiées

Demande de Seb (31/10) : des icônes dédiées pour les sujets de conversation, à la place des images empruntées à d'autres écrans.

- Les quatre sujets pointent vers leurs propres chemins, dans `images/Icons/camp/` :
  - `topic_talk.webp` (« Il veut te parler ») ;
  - `topic_self.webp` (« Parle-moi de toi ») ;
  - `topic_world.webp` (« Et ce monde-ci ? ») ;
  - `topic_quest.webp` (« Ta quête »).
- Les prompts sont dans l'atelier des images, groupe « Sujets de conversation au feu ».
- Tant que les fichiers manquent, l'icône générique s'affiche (règle « icône manquante ») et le chemin est noté dans `MISSING_ICONS`.
- `tools/audit/missing-icons.js` relève aussi ces icônes et les 14 reliques uniques.

## Contrôles
- `round-harness` : 5 672 OK, 0 échec, sur deux passes.
- `boot-harness` : 4 OK. `parcours-harness` : 142 OK.
- Audit i18n : 100 %.
- Audit des icônes : 5 absentes connues (les 4 sujets et `dungeon_entrance.webp`).
