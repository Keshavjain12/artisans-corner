/** Realistic demo catalogue for the seeded marketplace. */
import { productPhoto, storePhoto } from '../config/photoManifest.js';
import { MORE_PRODUCTS } from './more-products.js';

export const DEMO_PASSWORDS = {
  admin: 'DemoAdmin123!',
  vendor: 'DemoVendor123!',
  buyer: 'DemoBuyer123!',
};

export const STORES = [
  {
    key: 'terra',
    owner: { name: 'Meera Kulkarni', email: 'vendor@artisanscorner.demo', password: DEMO_PASSWORDS.vendor },
    name: 'Terra & Thread',
    tagline: 'Slow pottery and block print from Jaipur',
    description:
      'Meera fires every pot in a small wood kiln behind her studio in Jaipur, then finishes each piece with the block prints her family has cut by hand for three generations. Nothing here is made twice the same way.',
    location: { city: 'Jaipur', state: 'Rajasthan', country: 'India' },
  },
  {
    key: 'kiln',
    owner: { name: 'Ines Ferreira', email: 'ines@artisanscorner.demo', password: DEMO_PASSWORDS.vendor },
    name: 'Kiln & Coast',
    tagline: 'Atlantic-glazed stoneware from Lisbon',
    description:
      'A two-person ceramics studio a short walk from the Tagus. Ines and her partner throw tableware in small batches and glaze it in the sea greens and salt whites of the Portuguese coast.',
    location: { city: 'Lisbon', state: 'Lisboa', country: 'Portugal' },
  },
  {
    key: 'fern',
    owner: { name: 'Tama Whitfield', email: 'tama@artisanscorner.demo', password: DEMO_PASSWORDS.vendor },
    name: 'Silver Fern Atelier',
    tagline: 'Hand-forged silver, Wellington',
    description:
      'Recycled sterling silver, forged and finished at a single bench. Tama casts from botanical impressions gathered on the Wellington south coast, so every piece keeps a real leaf or shell edge.',
    location: { city: 'Wellington', state: 'Wellington', country: 'New Zealand' },
  },
  {
    key: 'oak',
    owner: { name: 'Daniel Reyes', email: 'daniel@artisanscorner.demo', password: DEMO_PASSWORDS.vendor },
    name: 'Oakhollow Woodworks',
    tagline: 'Joinery and turned wood, Portland',
    description:
      'Furniture-grade offcuts rescued from local mills and turned into lamps, boards and small furniture. Every piece is finished with a food-safe hardwax oil and signed on the underside.',
    location: { city: 'Portland', state: 'Oregon', country: 'United States' },
  },
  {
    key: 'indigo',
    owner: { name: 'Rahul Desai', email: 'rahul@artisanscorner.demo', password: DEMO_PASSWORDS.vendor },
    name: 'Indigo Loom',
    tagline: 'Natural dye and handloom from Kutch',
    description:
      'A weaver collective working with natural indigo, madder and pomegranate rind. Cloth is loomed on pit looms, stitched locally, and every order supports fourteen weaving families.',
    location: { city: 'Bhuj', state: 'Gujarat', country: 'India' },
  },
  {
    key: 'pigment',
    owner: { name: 'Aoife Sinclair', email: 'aoife@artisanscorner.demo', password: DEMO_PASSWORDS.vendor },
    name: 'Paper & Pigment Studio',
    tagline: 'Original works on paper, Edinburgh',
    description:
      'Small-edition linocuts and original gouache studies of the Scottish coast, printed by hand on cotton rag paper in a top-floor studio in Leith.',
    location: { city: 'Edinburgh', state: 'Scotland', country: 'United Kingdom' },
  },
];

export const BUYERS = [
  { name: 'Ava Thompson', email: 'buyer@artisanscorner.demo', password: DEMO_PASSWORDS.buyer },
  { name: 'Noah Bennett', email: 'noah@artisanscorner.demo', password: DEMO_PASSWORDS.buyer },
  { name: 'Priya Raman', email: 'priya@artisanscorner.demo', password: DEMO_PASSWORDS.buyer },
];

export const ADMIN = {
  name: 'Marketplace Admin',
  email: 'admin@artisanscorner.demo',
  password: DEMO_PASSWORDS.admin,
};

/**
 * Seed artwork is generated locally by scripts/generate-seed-art.mjs and served
 * from the client at /seed-art. It is deterministic, works offline and matches
 * the craft it illustrates - unlike the stock photography this replaced, which
 * needed the network, throttled under the load of a full page of cards, and
 * showed a bridge on a tote bag. Real vendors upload through Cloudinary.
 */
export const artSlug = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/*
 * Real photographs win when they exist. Drop files into photos/ and run
 * `npm run seed:photos`; anything without one keeps its generated
 * illustration, so photos can be added a few at a time.
 */

/**
 * The images a seeded product gets.
 *
 * With a real photograph and no second view, the product carries a single
 * image: repeating the same picture would give the gallery two identical
 * thumbnails, which looks like a mistake rather than a choice. The generated
 * illustrations always come as a pair, since the second is a genuinely
 * different view of the same piece.
 */
export const productArt = (name) => {
  const slug = artSlug(name);
  const photo = productPhoto(slug);

  if (photo?.main) {
    const images = [{ url: photo.main, publicId: '', alt: name }];
    if (photo.second) {
      images.push({ url: photo.second, publicId: '', alt: `${name}, second view` });
    }
    return images;
  }

  return [
    { url: `/seed-art/${slug}.svg`, publicId: '', alt: name },
    { url: `/seed-art/${slug}-2.svg`, publicId: '', alt: `${name}, second view` },
  ];
};

/**
 * A shop's imagery. The banner is a real photograph once one has been imported
 * for that shop, falling back to the generated illustration otherwise. The logo
 * stays drawn on purpose: it reads as a maker's mark at 80px, which a cropped
 * photograph does not.
 */
export const storeArt = (key) => ({
  logo: `/seed-art/store-${key}-logo.svg`,
  banner: storePhoto(key) || `/seed-art/store-${key}-banner.svg`,
});

export const PRODUCTS = [
  { store: 'terra', name: 'Hand-Painted Ceramic Vase', category: 'pottery', price: 68, compareAtPrice: 85, stock: 12, featured: true, tags: ['vase', 'ceramic', 'hand-painted'],
    description: 'A wheel-thrown stoneware vase, glazed in soft oatmeal and finished with a cobalt vine painted freehand around the shoulder. Roughly 24cm tall; each one varies slightly because the brushwork is never repeated.' },
  { store: 'terra', name: 'Jaipur Block Print Tote', category: 'bags', price: 42, compareAtPrice: null, stock: 30, featured: true, tags: ['tote', 'block-print', 'cotton'],
    description: 'Heavy cotton canvas, hand block printed with carved teak blocks in madder red and indigo. Cotton webbing handles, an inside slip pocket, and a base wide enough for a market shop.' },
  { store: 'terra', name: 'Terracotta Planter Set of Three', category: 'home-decor', price: 54, compareAtPrice: 70, stock: 18, featured: false, tags: ['planter', 'terracotta', 'garden'],
    description: 'Three unglazed terracotta planters in graduated sizes, thrown from local red clay and left raw so the pots breathe. Drainage hole and matching saucer included with each.' },
  { store: 'terra', name: 'Speckled Clay Dinner Plates', category: 'pottery', price: 96, compareAtPrice: null, stock: 8, featured: false, tags: ['tableware', 'plates', 'stoneware'],
    description: 'A set of four 27cm dinner plates in speckled buff stoneware with a clear satin glaze. Dishwasher and microwave safe, fired to 1260C so the edges stay chip-resistant.' },
  { store: 'terra', name: 'Hand-Thrown Tea Set', category: 'ceramics', price: 118, compareAtPrice: 140, stock: 5, featured: true, tags: ['tea', 'ceramics', 'gift'],
    description: 'A 600ml teapot with a cane handle and four small cups, glazed in a celadon that pools green where the throwing rings catch it. Packed in a recycled kraft gift box.' },

  { store: 'kiln', name: 'Atlantic Glaze Serving Bowl', category: 'ceramics', price: 74, compareAtPrice: null, stock: 14, featured: true, tags: ['bowl', 'serving', 'stoneware'],
    description: 'A generous 28cm serving bowl in white stoneware with a sea-green glaze that breaks to salt white over the rim. Wide enough for a whole salad, light enough to pass around a table.' },
  { store: 'kiln', name: 'Salt-White Espresso Cups', category: 'ceramics', price: 46, compareAtPrice: 58, stock: 22, featured: false, tags: ['espresso', 'cups', 'kitchen'],
    description: 'Four 80ml espresso cups with an unglazed foot and a matte white interior. The walls are thrown thin so the coffee stays hot without scalding your fingers.' },
  { store: 'kiln', name: 'Ribbed Stoneware Mug', category: 'ceramics', price: 28, compareAtPrice: null, stock: 40, featured: true, tags: ['mug', 'coffee', 'everyday'],
    description: 'A 350ml everyday mug with a deep ribbed body that gives your hand something to hold. Fired twice, glazed inside and out, and happy in the dishwasher every day of the week.' },
  { store: 'kiln', name: 'Coastal Ceramic Wall Tiles', category: 'home-decor', price: 88, compareAtPrice: null, stock: 9, featured: false, tags: ['tiles', 'wall-art', 'ceramics'],
    description: 'A set of six 15cm hand-pressed tiles in four coastal glazes, ready to hang as a group or set into a splashback. Each tile carries the maker stamp on the reverse.' },
  { store: 'kiln', name: 'Olive Oil Pourer', category: 'ceramics', price: 39, compareAtPrice: null, stock: 16, featured: false, tags: ['kitchen', 'pourer', 'olive-oil'],
    description: 'A 400ml stoneware pourer with a drip-free lip, glazed in olive green. Opaque walls keep light off the oil, which is exactly how good oil wants to be stored.' },
];

PRODUCTS.push(
  { store: 'fern', name: 'Silver Artisan Necklace', category: 'jewelry', price: 132, compareAtPrice: 160, stock: 7, featured: true, tags: ['necklace', 'silver', 'botanical'],
    description: 'A recycled sterling silver pendant cast from a real kawakawa leaf, hung on a 45cm fine belcher chain. The leaf veins are the plant\u2019s own, picked up in the mould and kept in the metal.' },
  { store: 'fern', name: 'Hammered Silver Hoops', category: 'jewelry', price: 78, compareAtPrice: null, stock: 15, featured: true, tags: ['earrings', 'hoops', 'silver'],
    description: 'Sterling silver hoops, 28mm across, hammered by hand so every facet catches light differently. Light enough to forget you are wearing them.' },
  { store: 'fern', name: 'Sea Glass Signet Ring', category: 'jewelry', price: 96, compareAtPrice: null, stock: 6, featured: false, tags: ['ring', 'sea-glass', 'silver'],
    description: 'A wide silver band set with a tumbled sea glass cabochon collected on the Wellington south coast. Made to order in your size; every stone is a slightly different green.' },
  { store: 'fern', name: 'Brass Feather Cuff', category: 'accessories', price: 58, compareAtPrice: 72, stock: 11, featured: false, tags: ['cuff', 'brass', 'bracelet'],
    description: 'An open brass cuff, chased with a feather motif and sealed with a clear lacquer so it keeps its shine. Gently adjustable to fit most wrists.' },
  { store: 'fern', name: 'Fine Silver Stacking Rings', category: 'jewelry', price: 64, compareAtPrice: null, stock: 20, featured: false, tags: ['rings', 'stacking', 'minimal'],
    description: 'Three fine silver bands - one smooth, one twisted, one hammered - designed to be worn together or spread across a hand. Sold as a set of three.' },

  { store: 'oak', name: 'Handcrafted Wooden Lamp', category: 'woodwork', price: 165, compareAtPrice: 195, stock: 4, featured: true, tags: ['lamp', 'oak', 'lighting'],
    description: 'A turned white oak table lamp with a linen shade and a fabric-braided cord. The grain runs unbroken from base to neck because the whole body is turned from one block.' },
  { store: 'oak', name: 'Walnut Serving Board', category: 'woodwork', price: 72, compareAtPrice: null, stock: 19, featured: true, tags: ['board', 'walnut', 'kitchen'],
    description: 'A 45cm black walnut board with a hand-routed juice groove and a leather hanging loop. Finished with food-safe hardwax oil; re-oil twice a year and it will outlast the kitchen.' },
  { store: 'oak', name: 'Carved Oak Bookends', category: 'home-decor', price: 84, compareAtPrice: null, stock: 10, featured: false, tags: ['bookends', 'oak', 'study'],
    description: 'A weighted pair of solid oak bookends with a hand-carved chip pattern on the face and cork feet underneath so they hold a full shelf without sliding.' },
  { store: 'oak', name: 'Turned Cherry Bowl', category: 'woodwork', price: 110, compareAtPrice: 130, stock: 6, featured: false, tags: ['bowl', 'cherry', 'turned'],
    description: 'A 26cm bowl turned from a single piece of storm-fallen cherry, sanded to 400 grit and finished inside and out. Dry-wipe only; this one is for fruit and keys, not the dishwasher.' },
  { store: 'oak', name: 'Ash Wood Coffee Scoop', category: 'handmade-gifts', price: 24, compareAtPrice: null, stock: 35, featured: false, tags: ['coffee', 'scoop', 'gift'],
    description: 'A hand-carved ash scoop that holds exactly one 18g dose. Small, useful and quietly satisfying - the sort of thing people keep for twenty years.' }
);

PRODUCTS.push(
  { store: 'indigo', name: 'Handwoven Cotton Cushion Cover', category: 'home-decor', price: 38, compareAtPrice: 48, stock: 26, featured: true, tags: ['cushion', 'handloom', 'cotton'],
    description: 'A 45cm square cover woven on a pit loom in undyed cotton with a natural indigo stripe. Hidden zip, pre-washed, and it softens with every wash rather than wearing out.' },
  { store: 'indigo', name: 'Natural Indigo Scarf', category: 'accessories', price: 52, compareAtPrice: null, stock: 21, featured: true, tags: ['scarf', 'indigo', 'natural-dye'],
    description: 'A lightweight cotton scarf dipped eight times in a natural indigo vat, so the blue sits deep rather than on the surface. Two metres long, with hand-knotted fringing.' },
  { store: 'indigo', name: 'Ajrakh Print Kimono Jacket', category: 'clothing', price: 128, compareAtPrice: 155, stock: 9, featured: true, tags: ['jacket', 'ajrakh', 'handmade'],
    description: 'An unlined cotton kimono jacket in a sixteen-step ajrakh print, dyed with madder and indigo. Loose through the body, wrist-length sleeves, and a single patch pocket.' },
  { store: 'indigo', name: 'Handloom Cotton Table Runner', category: 'home-decor', price: 44, compareAtPrice: null, stock: 17, featured: false, tags: ['table-runner', 'handloom', 'dining'],
    description: 'A 180cm runner woven in slub cotton with a woven border rather than a printed one, so the pattern reads the same on both sides of the table.' },
  { store: 'indigo', name: 'Kutch Embroidered Pouch', category: 'bags', price: 32, compareAtPrice: null, stock: 28, featured: false, tags: ['pouch', 'embroidery', 'gift'],
    description: 'A small zip pouch hand embroidered with mirror work by artisans in Bhuj. Cotton lined, roughly 20 x 13cm - the right size for cables, cards or a paintbrush roll.' },

  { store: 'pigment', name: 'Harbour Light Linocut Print', category: 'art', price: 85, compareAtPrice: null, stock: 12, featured: true, tags: ['linocut', 'print', 'coastal'],
    description: 'A three-colour reduction linocut of the Fife coast at low tide, hand pulled in an edition of forty on 300gsm cotton rag. Signed, numbered and sold unframed at A3.' },
  { store: 'pigment', name: 'Original Gouache Coastal Study', category: 'art', price: 240, compareAtPrice: 290, stock: 2, featured: true, tags: ['painting', 'original', 'gouache'],
    description: 'An original 30 x 40cm gouache study painted on location at North Berwick over two mornings. One of a kind, supplied with a certificate and a hand-cut mount.' },
  { store: 'pigment', name: 'Botanical Ink Drawing Set', category: 'art', price: 64, compareAtPrice: null, stock: 14, featured: false, tags: ['drawing', 'botanical', 'set'],
    description: 'Three A4 ink drawings of Scottish hedgerow plants, printed as archival giclees and packed flat in a rigid folder. Designed to hang as a set of three.' },
  { store: 'pigment', name: 'Letterpress Greeting Card Set', category: 'handmade-gifts', price: 22, compareAtPrice: 28, stock: 45, featured: false, tags: ['cards', 'letterpress', 'stationery'],
    description: 'Eight blank letterpress cards printed on a 1960s Heidelberg platen, two each of four designs, with recycled kraft envelopes and a paper band.' },
  { store: 'pigment', name: 'Hand-Bound Sketchbook', category: 'handmade-gifts', price: 46, compareAtPrice: null, stock: 23, featured: false, tags: ['sketchbook', 'bookbinding', 'gift'],
    description: 'An A5 coptic-bound sketchbook with 120 pages of 140gsm cartridge paper and a marbled cover papered by hand. Opens completely flat, which is the whole point.' }
);

/* Seventy more pieces, so every category holds ten - see more-products.js. */
PRODUCTS.push(...MORE_PRODUCTS);
