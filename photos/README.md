# Product photo inbox

Drop real product photographs here, then run:

```bash
npm run seed:photos
npm run seed          # or restart npm run dev:memory
```

## Naming

Name each file after the **product slug** — the product name in lowercase with
hyphens:

```
photos/hand-painted-ceramic-vase.jpg      the main photo
photos/hand-painted-ceramic-vase-2.jpg    an optional second view
```

`npm run seed:photos` prints the full list of slugs still waiting for a photo,
so you never have to guess one.

Products without a photo keep their generated illustration, so you can add them
a few at a time.

## Where to get images you are allowed to use

| Source | Licence |
| --- | --- |
| [unsplash.com](https://unsplash.com) | Free for commercial use, no attribution required |
| [pexels.com](https://pexels.com) | Free for commercial use, no attribution required |
| [pixabay.com](https://pixabay.com) | Free for commercial use, no attribution required |

**Do not take images from Pinterest, Google Images or a shop's website.** Those
are other people's copyrighted photographs, and using them in a submitted
project is a real problem rather than a theoretical one. The three sites above
exist precisely for this.

Search terms that match this catalogue well: *handmade ceramic mug*, *stoneware
bowl*, *block print tote*, *silver jewellery*, *wooden serving board*,
*terracotta planter*, *linocut print*.

## Sizing

Keep files **under 2MB** and around 1200px on the long edge — the importer warns
if a file is larger. Anything bigger just slows the page down; the cards display
at roughly 400px.

Files in this folder are not committed to git. The importer copies what it needs
into `frontend/public/product-photos/`, which is.
