# Architecture radio ↔ site — aide-mémoire opérationnel

Extrait opérationnel de `LCN-architecture-serveur-site-web.md` (référence complète).

## Les vérités serveur

| Donnée | Endpoint | Refresh site | Rôle |
|---|---|---:|---|
| Flux audio | `stream.mp3` | — | source unique du player (`<audio>`, `preload="none"`) |
| Titre en cours | `nowplaying.json` | 12 s | **le morceau réellement lu** |
| Show en cours | `current-show.json` | 12 s | **le bloc/émission/DIRECT réellement entendu** |
| Auditeurs | `listeners.json` | 30 s | audience du mount `/stream.mp3` |
| Historique | `history/nowplaying.csv` | jamais en boucle | archives complètes (UTC) |

URLs centralisées dans `assets/js/config.js` — ne jamais les dupliquer ailleurs.

## Règles non négociables

1. `nowplaying` ≠ `current-show` : ne jamais déduire l'un de l'autre, ni le show de l'heure.
2. La grille (`content-data.js`) est **indicative** ; `current-show.json` est la vérité.
3. DIRECT : prioritairement `is_live`/`kind=live` de current-show ; le préfixe `DIRECT - `
   dans nowplaying (convention BUTT) sert d'indice complémentaire (`isLiveHint`).
4. Les variantes `endcap` sont retirées de l'affichage (`stripEndcap`).
5. `listeners.json` : vérifier `mount === "/stream.mp3"` et la fraîcheur d'`updatedAt`
   (périmé → « audience momentanément indisponible », jamais un chiffre faux).
6. Heures affichées en `Europe/Paris` via `Intl` uniquement (`time.js`) — zéro offset manuel.
7. Une panne de métadonnées ne casse jamais l'écoute : dernier état connu + dégradation sobre.
8. Jamais d'appel direct à Icecast (port 8000, `status-json.xsl`) ni d'exposition du port 8005.
9. Le redémarrage Liquidsoap quotidien (04:10) est traité comme une coupure réseau ordinaire.
10. Onglet caché : les pollers sautent les fetchs mais restent programmés (`poller.js`).

## Latence audio vs métadonnées (comportement normal)

Les métadonnées (`nowplaying`/`current-show`) sont des JSON instantanés ; l'audio, lui, traverse
des tampons (burst Icecast + buffer navigateur) : l'auditeur entend l'antenne avec quelques
secondes à dizaines de secondes de retard. Au passage en DIRECT, il est donc **normal** de voir
« direct — on air » s'afficher avant d'entendre le direct — le texte annonce, le son suit.
Côté site : chaque mise en lecture ouvre une connexion neuve au flux (cache-buster dans
`player.js`) pour ne jamais resservir un tampon périmé après pause ou rechargement.

## Vérification avant release

Checklist complète : `TEST-MATRIX.md` (doc de pilotage, hors dépôt). Commandes endpoints : `docs/MAINTENANCE.md`.
Évolution serveur prévue (Range CORS) : `docs/SPEC-SERVEUR-HISTORIQUE.md`.
