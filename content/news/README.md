# Actualités du Chat Noir

Chaque actualité vit dans un fichier Markdown distinct.

Structure attendue :

```md
---
title: "Titre de l’actualité"
publishedOn: "2026-04-22"
order: "1"
---

Premier paragraphe = chapeau de l’actualité.

Les paragraphes suivants forment le corps du billet.
Tu peux utiliser du Markdown simple, notamment les liens :
[un lien](https://example.com)
```

Notes :

- `publishedOn` sert au tri par date.
- `order` sert à ordonner plusieurs actualités le même jour.
  Plus le nombre est élevé, plus l’actualité remonte haut dans la journée.
- Le premier paragraphe devient le chapeau affiché sur le site.
- Les paragraphes suivants deviennent le corps du billet.

Commandes utiles :

```bash
npm run news:new -- --title "Titre de l’actualité"
npm run build:news
```

Outil local :

- `news-studio.html` permet de préparer un billet, générer son Markdown, le copier ou le télécharger.
- ouvre-le via le petit serveur local du projet pour profiter aussi de l’aperçu des actualités existantes.
