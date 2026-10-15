# Upway start-up kit page

The page customers open by scanning the QR code on the checklist label inside every e-bike box.
It walks them through unboxing, assembly and the first ride.

`index.html` is the whole site: HTML, CSS, JavaScript, translations (EN, DE, FR, NL, ES, IT) and
photos are inline, about 450 KB. There is no build step and no backend, and the page sets no cookies.

## URL parameters

The label prints a link like `https://<host>/?b=RK3CZ5&lang=de`.

| Parameter | Format | Effect |
|---|---|---|
| `b` | bike id, 6 letters or digits | The top photo becomes `https://storage.googleapis.com/upway-public/images/bikes/<id>-1.jpg`. Without it, or if that file is missing, a generic photo is shown. |
| `lang` | 2-letter language code | Starting language, taken from the order. A language the visitor picks in the menu takes priority (saved in `localStorage` as `upway-lang`). Without it, the browser language is used, then English. |

## Hosting requirements

Any static host works. It needs to:

- serve `index.html` publicly over HTTPS, without login, as `text/html; charset=utf-8`;
- keep the query string (`?b=…&lang=…`); a redirect that drops it loses the bike photo and the language;
- use a short cache, for example `Cache-Control: public, max-age=300`, so updates show up quickly.

The page loads these external resources:

| Host | What |
|---|---|
| `fonts.googleapis.com`, `fonts.gstatic.com` | Outfit and Hanken Grotesk fonts |
| `storage.googleapis.com` | bike photos (`upway-public` bucket) |
| `i.ytimg.com` | video cover, loaded when the video window opens |
| `www.youtube-nocookie.com` | video player, loaded only after the visitor presses play |
| `upway.de` | favicon |

If the host sends a Content-Security-Policy, allow these hosts, plus inline scripts and styles.
If company policy does not allow Google Fonts, the two fonts can be self-hosted next to `index.html`.

## Options

**Google Cloud Storage.** The `upway-public` bucket already serves the bike photos publicly:

```
gcloud storage cp index.html gs://upway-public/startup-kit/index.html \
  --content-type="text/html; charset=utf-8" --cache-control="public, max-age=300"
```

If the bucket uses per-object ACLs, add `--predefined-acl=publicRead`. The URL becomes
`https://storage.googleapis.com/upway-public/startup-kit/index.html`.

**A subdomain** such as `start.upway.de`, on any web server or CDN, serving `index.html` at `/`.

**GitHub Pages** (current test setup): `https://upwamaurimaciel.github.io/startup-kit/`. For production, move
this repository to an Upway organization and add a custom domain.

## After choosing the final URL

1. In the Chrome extension, set `SETUP_GUIDE_URL` in `src/content/checklist_data.js` to the new URL and release it.
2. Labels printed during the test point to `https://upwamaurimaciel.github.io/startup-kit/`. Keep that site
   online, or replace its `index.html` with a redirect to the new URL that keeps the query string.

## Updating the page

The source is in the Upway extension repository, branch `feat/startup-kit-landing`, folder `startup-kit/`.
Run `node startup-kit/preview.mjs` and copy `startup-kit/build/preview.html` here as `index.html`.
