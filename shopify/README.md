# Start-up kit page on Shopify

The page customers open by scanning the QR code on the checklist label inside every e-bike box.
This folder puts it on Upway's own Shopify store as a standalone page: only this page's HTML, CSS and
JavaScript. Nothing from the store theme is loaded: no header or footer, no theme CSS or fonts, no app
scripts, no chat, pop-ups, push prompts or cookie banner.

## How

`templates/page.start-up-kit.liquid` starts with `{% layout none %}`. Shopify then renders the template on
its own instead of wrapping it in `layout/theme.liquid`, so nothing the theme or the apps inject reaches
the page. The page keeps its own fonts (Outfit and Hanken Grotesk).

| File | Content |
|---|---|
| `templates/page.start-up-kit.liquid` | the page (about 112 KB; Shopify's limit for a Liquid file is 256 KB) |
| `assets/startup-kit.css` | styles |
| `assets/startup-kit.js` | behaviour: bike photo, language menu, steps, video |
| `assets/startup-kit-copy.js` | texts in EN, DE, FR, NL, ES, IT |
| `assets/startup-kit-*.webp` | page photos |

Every file name is new. Nothing here replaces an existing theme file.

## The store (checked 2026-10-16, verify before relying on it)

- `upway.de` is a Hydrogen storefront (response header `powered-by: Shopify, Oxygen, Hydrogen`) that serves
  `/pages/...` from the Online Store.
- The Online Store answers on `checkout.upway.de`. Its `myshopify` domain is `upway-germany.myshopify.com`
  (from `https://checkout.upway.de/meta.json`), and the live theme id was `132536926380`
  (`server-timing` header of `https://checkout.upway.de/pages/faq`). The live theme uses GemPages v6.

## Setup

Needs a staff account that can edit theme code and create pages, and Shopify CLI 3.x for step 2
(`npm install -g @shopify/cli`).

1. **Get the files.**
   ```
   git clone https://github.com/UPWAmauriMaciel/startup-kit
   cd startup-kit/shopify
   ```
2. **Upload only these files to the live theme.** They are unused until a page selects the template, so
   existing pages don't change. Check the flags with `shopify theme push --help` first, then from this folder:
   ```
   shopify theme push --store upway-germany.myshopify.com --theme 132536926380 --allow-live --nodelete --only "templates/page.start-up-kit.liquid" --only "assets/startup-kit*"
   ```
   `--nodelete` keeps every other theme file. Without the CLI, use the admin instead: Online Store →
   Themes → live theme → … → Edit code. Under `templates`, add a new template of type *page* named
   `start-up-kit` and paste the file content. Under `assets`, upload the other files.
3. **Create the page.** Admin → Online Store → Pages → Add page:
   - Title: `Start-up kit`, content empty.
   - Theme template: `start-up-kit`. The list only shows templates of the live theme, which is why step 2
     goes to the live theme.
   - Search engine listing → URL handle: `start-up-kit`.
   - Visible. Don't add it to any menu.
4. **Test in a private window**, so the staff preview bar doesn't show:
   - `https://checkout.upway.de/pages/start-up-kit?b=RK3CZ5&lang=de`
   - `https://upway.de/pages/start-up-kit?b=RK3CZ5&lang=de`

   Expected: only the guide, in German, with that bike's photo at the top. No store header or footer, no chat
   bubble, no pop-ups. Switch the language in the menu, open a step, play the video. The page source starts
   with `<!DOCTYPE html>`.

   If `upway.de/pages/start-up-kit` doesn't show the page, or drops `?b=` and `lang=`, the Hydrogen app needs
   to pass this route through. Until then, use the `checkout.upway.de` address.
5. **Send the final URL to Amauri.** He points the QR code of the packing label to it: `SETUP_GUIDE_URL` in
   the Chrome extension. Labels printed so far point to `https://upwamaurimaciel.github.io/startup-kit/`,
   which stays online.

## Later

- **Updating the page:** the source is in the Upway extension repository, branch `feat/startup-kit-landing`,
  folder `startup-kit/`. Run `node startup-kit/preview.mjs`, then repeat step 2 with `startup-kit/build/shopify/`.
- **New theme:** when the store publishes another theme, copy these files into it before publishing.
  Otherwise the page falls back to the default page template and shows the store layout.
- **Rollback:** set the page back to the default template, or delete the page, then delete the files.
- **Privacy:** the page sets no cookies and loads no store or tracking scripts. It loads the two fonts from
  Google Fonts. It loads the YouTube player (youtube-nocookie) only after the visitor presses play. If
  company policy rules out Google Fonts, upload Outfit and Hanken Grotesk (both SIL OFL) as theme assets
  and change the font `<link>` in the template.

## Ground rules for whoever runs the setup

Touch only the files listed above and the one new page. Don't edit other theme files, publish or unpublish
themes, or change GemPages pages.
