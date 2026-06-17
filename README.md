# Le Chat Noir — site public

Site de la webradio Le Chat Noir (laboratoire radiophonique indépendant). Statique,
servi par GitHub Pages. Doc de pilotage tenue hors dépôt.

## Lancer en local

```bash
npm run serve
# puis ouvrir http://localhost:48290
```

(Modules ES natifs : le site doit être servi en HTTP, pas ouvert en `file://`.)

## Tests unitaires

```bash
npm test
```

Aucune dépendance : `node --test` (Node 20+). Les fixtures de `tests/unit/fixtures/`
proviennent de captures réelles des endpoints du 11 juin 2026.

## Règles non négociables

- URLs d'endpoints uniquement dans `assets/js/config.js`
- Pas de `split(',')` sur le CSV — parseur RFC 4180 (`assets/js/csv.js`)
- Pas d'arithmétique de fuseau manuelle — `Intl` uniquement (`assets/js/time.js`)
- `nowplaying.json` ≠ `current-show.json` : ne jamais déduire le show de l'heure
- Jamais de fetch CSV périodique sur la home
- Jamais de recréation de l'élément `<audio>` pendant la navigation
- Aucun secret, aucune dépendance runtime
