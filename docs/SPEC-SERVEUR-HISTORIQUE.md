# Spécification serveur — requêtes partielles sur l'historique (phase 2)

**Statut :** à déployer dans un second temps du projet (décision D13 du plan d'action).
**Objet :** permettre au site de ne télécharger que la fin du CSV historique au lieu du fichier
complet (6,3 Mo au 11 juin 2026, ~25 Mo/an de croissance).

## 1. Constat

- `https://stream.lechatnoirradio.fr/history/nowplaying.csv` supporte déjà les requêtes
  partielles : `Range: bytes=-2048` → `206 Partial Content` ✓ (vérifié le 11/06/2026).
- **Mais** le préflight CORS n'autorise que `Content-Type` : un `fetch` navigateur avec
  en-tête `Range` échoue depuis `lechatnoirradio.fr`.

## 2. Modification Nginx demandée

Dans le vhost `stream.lechatnoirradio.fr`, pour `location /history/` (et uniquement celle-ci) :

```nginx
# Avant (état observé)
add_header Access-Control-Allow-Headers "Content-Type";

# Après
add_header Access-Control-Allow-Headers "Content-Type, Range";
add_header Access-Control-Expose-Headers "Content-Range, Content-Length";
```

Les autres en-têtes (`Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: GET, OPTIONS`,
`Cache-Control: no-store…`) restent inchangés. Aucune autre location n'est concernée.

## 3. Procédure de déploiement (conforme § 21 du doc architecture)

1. sauvegarder la configuration : `sudo cp /etc/nginx/sites-available/<vhost> <vhost>.bak-$(date +%F)` ;
2. appliquer la modification ;
3. `sudo nginx -t` ;
4. `sudo systemctl reload nginx` (reload, pas restart : aucune coupure du flux) ;
5. valider depuis l'extérieur (§ 4) ;
6. en cas de problème : restaurer le `.bak` puis `nginx -t && systemctl reload nginx`.

## 4. Tests de validation (depuis une machine externe)

```bash
# Préflight : Range doit apparaître dans Access-Control-Allow-Headers
curl -sS -D - -o /dev/null -X OPTIONS \
  -H "Origin: https://lechatnoirradio.fr" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: range" \
  https://stream.lechatnoirradio.fr/history/nowplaying.csv

# Requête partielle : 206 + Content-Range
curl -sS -D - -o /dev/null -H "Range: bytes=-102400" \
  https://stream.lechatnoirradio.fr/history/nowplaying.csv

# Non-régression : la requête complète reste un 200 ordinaire
curl -sS -o /dev/null -w '%{http_code}\n' \
  https://stream.lechatnoirradio.fr/history/nowplaying.csv
```

## 5. Côté site (déjà prêt)

`assets/js/radio-api.js` → `fetchHistoryCsv({ tailBytes })` accepte déjà l'option. Une fois le
serveur déployé, il suffira d'activer `tailBytes` aux points d'appel (home : ~100 Ko ; refresh
de la page historique). La première ligne d'une réponse partielle peut être tronquée : le
parseur l'ignore déjà (ligne sans timestamp valide).
