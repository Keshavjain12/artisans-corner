import { categoryPhoto } from './photoManifest.js';

const img = (slug) => categoryPhoto(slug) || `/seed-art/category-${slug}.svg`;

export const CATEGORY_SEED = [
  {
    slug: 'home-decor',
    name: 'Home Decor',
    description: 'Warm, characterful pieces that make a house feel handmade.',
    image: img('home-decor'),
    displayOrder: 1,
  },
  {
    slug: 'pottery',
    name: 'Pottery',
    description: 'Wheel-thrown and hand-built stoneware from small studios.',
    image: img('pottery'),
    displayOrder: 2,
  },
  {
    slug: 'jewelry',
    name: 'Jewelry',
    description: 'Hand-forged silver, brass and stone, made in tiny batches.',
    image: img('jewelry'),
    displayOrder: 3,
  },
  {
    slug: 'clothing',
    name: 'Clothing',
    description: 'Naturally dyed, hand-loomed and slow-stitched garments.',
    image: img('clothing'),
    displayOrder: 4,
  },
  {
    slug: 'art',
    name: 'Art',
    description: 'Original paintings, prints and works on paper.',
    image: img('art'),
    displayOrder: 5,
  },
  {
    slug: 'woodwork',
    name: 'Woodwork',
    description: 'Joinery, carving and turned pieces in solid timber.',
    image: img('woodwork'),
    displayOrder: 6,
  },
  {
    slug: 'handmade-gifts',
    name: 'Handmade Gifts',
    description: 'Small-batch gifting, ready to wrap.',
    image: img('handmade-gifts'),
    displayOrder: 7,
  },
  {
    slug: 'ceramics',
    name: 'Ceramics',
    description: 'Glazed tableware, tiles and sculptural ceramics.',
    image: img('ceramics'),
    displayOrder: 8,
  },
  {
    slug: 'bags',
    name: 'Bags',
    description: 'Block-printed totes, leather satchels and woven carriers.',
    image: img('bags'),
    displayOrder: 9,
  },
  {
    slug: 'accessories',
    name: 'Accessories',
    description: 'Scarves, belts, hats and the finishing touches.',
    image: img('accessories'),
    displayOrder: 10,
  },
];

export const CATEGORY_SLUGS = CATEGORY_SEED.map((c) => c.slug);
