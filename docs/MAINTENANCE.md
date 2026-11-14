# Maintenance du site — Le Chat Noir

## Publier une version de l'app (macOS / Linux)

À chaque nouvelle release de l'app : publier le `.dmg` en GitHub Release (tag `vAA.MM.JJ`,
asset nommé **exactement `LeChatNoir.dmg`**), puis mettre à jour `assets/data/app-version.json`
(version, build, notes) — c'est ce fichier que l'app lit pour proposer une mise à jour.
**Process complet dans la doc de pilotage : `LCN-RELEASE-APP.md`.**

## Ajouter une actualité

Deux chemins, au choix :

**A. Studio (dans le navigateur)** — ouvrir `news-studio.html`, rédiger, puis
« Télécharger le fichier » et déposer le `.md` dans `content/news/`.

**B. Ligne de commande** :

```bash
npm run news:new -- --title "Titre de l'actualité"
# édite le fichier créé dans content/news/
```

Puis, dans les deux cas :

```bash
npm run build:news   # régénère news-data.js, news.json et feed.xml
```

et committer le tout (source `.md` + fichiers générés).

Règles : un paragraphe de chapeau, puis le corps ; Markdown simple (liens `[texte](url)`) ;
front matter `title` / `publishedOn` (AAAA-MM-JJ) / `order` (départage d'un même jour).

## Modifier la grille des programmes

La grille est une **donnée générée**, jamais éditée à la main dans le code :

1. Éditer la grille dans le **Concepteur-Grille** (LCN-Tools) — les champs « Site public »
   de chaque créneau et les « Résumés des jours » pilotent l'affichage du site.
2. Bouton **« Publier sur le site »** : sauvegarde, copie `assets/data/schedule.json`
   ici et régénère `assets/js/schedule-data.js` automatiquement.
3. Committer ces deux fichiers via GitHub Desktop. (`npm test` vérifie au passage que
   le fichier généré est en phase avec le JSON.)

À la main si besoin : copier l'export dans `assets/data/schedule.json` puis
`npm run build:schedule`.

Format des `slots` rendus : `time` (« 18h00 » ou « Puis »), `title`, `desc`,
options `meta` / `highlight` / `badge` (schéma `lcn-schedule/1`).

⚠️ Si un nom d'émission côté antenne (Liquidsoap) diffère du titre affiché, l'alias
se règle **dans le Concepteur-Grille** (titre interne ≠ titre site → alias automatique,
ou `settings.siteAliases` pour les variantes libres). Les paires brutes sortent dans
`schedule.json` → `aliases` et `schedule-match.js` les normalise au chargement.

## Voix et formats

Les voix sont une **donnée** : `assets/data/voices.json` (schéma `lcn-voices/1`) →
`producers` (rôle, nom, image, bio, lien optionnel) et `shows` (meta, titre, image,
texte, options `href` / `actionLabel` / `imageFit: "contain"`).

L'éditeur dédié est le **Concepteur-Voix** (LCN-Tools) : fiches éditables avec aides
contextuelles, aperçu du rendu, et bouton « Publier sur le site » qui écrit
`voices.json` et régénère `assets/js/voices-data.js` — il ne reste qu'à committer
les deux fichiers. À la main si besoin : éditer le JSON puis `npm run build:voices`.
Images à déposer dans `assets/media/producers/` et `assets/media/shows/`
(webp recommandé) avant de renseigner leur chemin dans les fiches.

## Vérifier les endpoints radio

```bash
curl -sS https://stream.lechatnoirradio.fr/nowplaying.json
curl -sS https://stream.lechatnoirradio.fr/current-show.json
curl -sS https://stream.lechatnoirradio.fr/listeners.json
curl -I  https://stream.lechatnoirradio.fr/history/nowplaying.csv
curl -L --max-time 10 -o /dev/null -w '%{http_code}\n' https://stream.lechatnoirradio.fr/stream.mp3
```

## Tester en local

```bash
npm run serve    # http://localhost:48290 (no-store : pas de cache pendant le dev)
npm test         # tests unitaires (Node 20+, aucune dépendance)
```

Pour tester depuis un téléphone : même réseau Wi-Fi, `http://<ip-du-mac>:48290`
(`ipconfig getifaddr en0` donne l'IP).

## Interdits permanents

Voir README — notamment : URLs d'endpoints uniquement dans `config.js`, jamais de fetch CSV
périodique sur la home, jamais déduire le show courant de l'heure quand `current-show.json`
répond, aucun secret dans le dépôt.
