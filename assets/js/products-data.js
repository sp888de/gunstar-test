// =========================================================
// GUNSTAR — products-data.js
// Single source of truth for every photo/video in the gallery
// and its product page. Add a new object here whenever you
// add a new visual — no other file needs to change.
//
// Fields:
//   id          unique string, matches ?item=<id> in the URL
//   tag         archive number shown on the media ("N°01")
//   name        product/piece name
//   category    used by the gallery filters + shown as eyebrow
//   media       array of { type: "photo"|"video", src } — the
//               FIRST entry is used as the gallery thumbnail and
//               as the default view on the product page. Add more
//               entries to get extra thumbnails on the product page,
//               like nobody.solutions does.
//   description short paragraph for the product page
//   details     array of [label, value] pairs for the "Details" tab
//   delivery    text for the "Delivery" tab
//   terms       text for the "Terms" tab
//
// IMPORTANT: every product object goes INSIDE the same [ ... ]
// array below, separated by commas. Never close the array (]) and
// reopen a new { ... } outside it — that breaks the whole file.
// =========================================================

const GUNSTAR_PRODUCTS = [
  {
    id: "01",
    tag: "N°0000",
    name: "INTRODUCTION",
    category: "None",
    media: [
      { type: "video", src: "https://res.cloudinary.com/iptm1k0x/video/upload/v1793478625/gunstarhomepage_2.mp4" }
    ],
    description: "Congratulations. Curiosity brought you into the archive. Here is some classified information for you : Three divisions operate inside GUNSTAR: Mercenary, Business man and Hacker. Each division controls a classified clothing series. Be awake. Choose GUNSTAR.",
    details: [
      ["Category", "Knowledge"]
    ],
    delivery: "Contact us at contact@gunstar.world for more information.",
    terms: "By submitting an enquiry you agree to be contacted by GUNSTAR about this piece. Usage rights are discussed and confirmed individually."
  },
  {
    id: "02",
    sizes: ["S", "M", "L", "XL"],
    tag: "N°1010",
    name: "SNIPER",
    purchasable: false,
price: null,
    category: "Mercenary",
    media: [
      { type: "photo", src: "https://res.cloudinary.com/iptm1k0x/image/upload/P7291261.jpg" },
      { type: "photo", src: "https://res.cloudinary.com/iptm1k0x/image/upload/P7291156.jpg" },
      { type: "photo", src: "https://res.cloudinary.com/iptm1k0x/image/upload/IMG_5662.jpg" }
    ],
    description: "This piece is sold out, try next time.",
    details: [
      ["Category", "Mercenary"],
    ],
    delivery: "Contact us at contact@gunstar.world for more information.",
    terms: "By submitting an enquiry you agree to be contacted by GUNSTAR about this piece. Usage rights are discussed and confirmed individually."
  },
  {
    id: "03",
    sizes: ["S", "M", "L", "XL"],
    tag: "N°1011",
    name: "Mechagirl",
    purchasable: false,
price: null,
    category: "Mercenary",
    media: [
      { type: "photo", src: "https://res.cloudinary.com/iptm1k0x/image/upload/IMG_5662.jpg" },
      { type: "photo", src: "https://res.cloudinary.com/iptm1k0x/image/upload/P7291158.jpg" },
      { type: "photo", src: "https://res.cloudinary.com/iptm1k0x/image/upload/P7291170.jpg" }
    ],
    description: "This piece is sold out, try next time.",
    details: [
      ["Category", "Mercenary"],
    ],
    delivery: "Contact us at contact@gunstar.world for more information.",
    terms: "By submitting an enquiry you agree to be contacted by GUNSTAR about this piece. Usage rights are discussed and confirmed individually."
  },
  {
    id: "04",
    sizes: ["S", "M", "L", "XL"],
    tag: "N°1100",
    name: "BOGO",
    purchasable: false,
price: null,
      category: "Business man",
    media: [
      { type: "photo", src: "https://res.cloudinary.com/iptm1k0x/image/upload/4-DSC00260.jpg" },
      { type: "photo", src: "https://res.cloudinary.com/iptm1k0x/image/upload/5-DSC00259.jpg" },
      { type: "photo", src: "https://res.cloudinary.com/iptm1k0x/image/upload/6-DSC00254.jpg" }
    ],
    description: "This piece is sold out, try next time.",
    details: [
      ["Category", "Business man"],
    ],
    delivery: "Contact us at contact@gunstar.world for more information.",
    terms: "By submitting an enquiry you agree to be contacted by GUNSTAR about this piece. Usage rights are discussed and confirmed individually."
  },
  {
    id: "05",
    sizes: ["S", "M", "L", "XL"],
    tag: "N°1101",
    name: "INSERT COIN",
    purchasable: false,
price: null,
    category: "Business man",
    media: [
      { type: "photo", src: "https://res.cloudinary.com/iptm1k0x/image/upload/IMG_3697.jpg" },
      { type: "photo", src: "https://res.cloudinary.com/iptm1k0x/image/upload/IMG_3533.jpg" },
      { type: "photo", src: "https://res.cloudinary.com/iptm1k0x/image/upload/tee_coin_inside_v2.png" }
    ],
    description: "This piece was exclusively made for the artist Arkan.",
    details: [
      ["Category", "Business man"],
    ],
    delivery: "Contact us at contact@gunstar.world for more information.",
    terms: "By submitting an enquiry you agree to be contacted by GUNSTAR about this piece. Usage rights are discussed and confirmed individually."
  },
  {
    id: "06",
    sizes: ["S", "M", "L", "XL"],
    tag: "N°10100",
    name: "Demon vest",
    purchasable: false,
price: null,
    category: "Mercenary",
    media: [
      { type: "photo", src: "https://res.cloudinary.com/iptm1k0x/image/upload/DSC07666.jpg" },
      { type: "photo", src: "https://res.cloudinary.com/iptm1k0x/image/upload/DSC07611.jpg" },
      { type: "photo", src: "https://res.cloudinary.com/iptm1k0x/image/upload/DSC07086.jpg" },
      { type: "photo", src: "https://res.cloudinary.com/iptm1k0x/image/upload/DSC07083.jpg" }
    ],
    description: "This piece is sold out, try next time.",
    details: [
      ["Category", "Mercenary"],
    ],
    delivery: "Contact us at contact@gunstar.world for more information.",
    terms: "By submitting an enquiry you agree to be contacted by GUNSTAR about this piece. Usage rights are discussed and confirmed individually."
  },
  {
    id: "07",
    tag: "11000",
    name: "Pop star wallpaper",
    purchasable: false,
price: null,
    category: "Business man",
    media: [
      { type: "photo", src: "assets/img/pop_star_wallpaper/29B29B0F-B199-42C5-8F34-66A8E97BBD47_1_102_o.jpeg" },
      { type: "photo", src: "assets/img/pop_star_wallpaper/AB676C5E-57C5-42B4-AFAD-664D34532DB0_1_102_o.jpeg" },
      { type: "photo", src: "assets/img/pop_star_wallpaper/67D1B77A-A1FF-4EEA-8BBD-A74CB02AD0B0.jpeg" }
    ],
    description: "This piece is sold out, try next time.",
    details: [
      ["Category", "Business man"],
    ],
    delivery: "Contact us at contact@gunstar.world for more information.",
    terms: "By submitting an enquiry you agree to be contacted by GUNSTAR about this piece. Usage rights are discussed and confirmed individually."
  },
  {
    id: "08",
    sizes: ["S", "M", "L", "XL"],
    tag: "1000",
    name: "Starboy",
    purchasable: false,
price: null,
    category: "Hacker",
    media: [
      { type: "photo", src: "https://res.cloudinary.com/iptm1k0x/image/upload/starface_copie.png" }
    ],
    description: "This piece is sold out, try next time.",
    details: [
      ["Category", "Hacker"],
    ],
    delivery: "Contact us at contact@gunstar.world for more information.",
    terms: "By submitting an enquiry you agree to be contacted by GUNSTAR about this piece. Usage rights are discussed and confirmed individually."
  },
  {
    id: "09",
    tag: "1001",
    name: "USB DRIVE",
    purchasable: true,
    price: 1990,
    sizes: [],
    displayOptions: ["64 Go", "128 Go"],
    category: "Hacker",
   media: [
     { type: "photo", src: "https://res.cloudinary.com/iptm1k0x/image/upload/IMG_6698.jpg" },
     { type: "photo", src: "https://res.cloudinary.com/iptm1k0x/image/upload/IMG_6697.jpg" },
     { type: "photo", src: "https://res.cloudinary.com/iptm1k0x/image/upload/IMG_6704.jpg" }
],
    description: "Every file matters. Every detail counts. Crafted from durable zinc alloy, the GUNSTAR USB Drive features USB 3.0 technology. <strong>The USB drive is delivered completely blank, with no preloaded files or software.</strong> <strong>Carry the data. Be Awake.</strong>",
    details: [
      ["Category", "Hacker"],
    ],
    delivery: "Contact us at contact@gunstar.world for more information.",
    terms: "By submitting an enquiry you agree to be contacted by GUNSTAR about this piece. Usage rights are discussed and confirmed individually."
  },
 {
    id: "10",
    tag: "10101",
    name: "GS GLOVES",
    purchasable: true,
    price: 2990,
    sizes: ["M", "L"],
    displayOptions: ["S", "M", "L", "XL"],
    category: "Mercenary",
   media: [
     { type: "photo", src: "https://res.cloudinary.com/iptm1k0x/image/upload/29102026-RAW05810.jpg" },
     { type: "photo", src: "https://res.cloudinary.com/iptm1k0x/image/upload/29102026-RAW05882.jpg" },
     { type: "photo", src: "https://res.cloudinary.com/iptm1k0x/image/upload/29102026-RAW05941.jpg" }
],
    description: "Built for the Mercenary. Designed for those who operate beyond the ordinary. Featuring a reflective finish and touchscreen-compatible fingertips, the GUNSTAR Gloves combine functionality with a tactical aesthetic. <strong>Stay equipped. Be Awake.</strong>",
    details: [
      ["Category", "Mercenary"],
    ],
    delivery: "Contact us at contact@gunstar.world for more information.",
    terms: "By submitting an enquiry you agree to be contacted by GUNSTAR about this piece. Usage rights are discussed and confirmed individually."
  } 
];
