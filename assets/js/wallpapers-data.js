// =========================================================
// GUNSTAR — wallpapers-data.js
// Dataset dédié à wallpaper.html. Reste volontairement séparé
// de products-data.js : ce sont deux systèmes indépendants.
//
// Pour ajouter un wallpaper : ajoute un objet à ce tableau et
// dépose le fichier correspondant dans assets/img/wallpapers/.
// Rien d'autre à modifier.
//
// Champs :
//   id          identifiant court, ex. "001"
//   tag         affiché dans l'UI, ex. "N°001"
//   name        nom du fichier tel qu'affiché
//   division    division GUNSTAR d'origine (optionnel)
//   status      statut par défaut avant scan ("UNVERIFIED")
//   format      dimensions réelles du fichier (calculées, jamais inventées)
//   src         chemin vers le fichier
//   description courte phrase optionnelle
//   access      "public" (fichiers destinés au téléchargement)
// =========================================================

const GUNSTAR_WALLPAPERS = [
  {
    id: "001",
    tag: "N°001",
    name: "GUNSTAR_N001",
    division: "ARCHIVE",
    status: "UNVERIFIED",
    format: "1500 × 2000",
    src: "https://res.cloudinary.com/iptm1k0x/image/upload/affiche_purple_dirt.png",
    description: "Visual transmission — placeholder file.",
    access: "public"
  },
  {
    id: "002",
    tag: "N°002",
    name: "GUNSTAR_N002",
    division: "ARCHIVE",
    status: "UNVERIFIED",
    format: "2000 × 1500",
    src: "https://res.cloudinary.com/iptm1k0x/image/upload/Affiche_brun_dirt.png",
    description: "Visual transmission — placeholder file.",
    access: "public"
  },
  {
    id: "003",
    tag: "N°003",
    name: "GUNSTAR_N003",
    division: "ARCHIVE",
    status: "UNVERIFIED",
    format: "1333 × 2000",
    src: "https://res.cloudinary.com/iptm1k0x/image/upload/stop_talkingv2.png",
    description: "Visual transmission — placeholder file.",
    access: "public"
  },
  {
    id: "004",
    tag: "N°004",
    name: "GUNSTAR_N004",
    division: "ARCHIVE",
    status: "UNVERIFIED",
    format: "1333 × 2000",
    src: "https://res.cloudinary.com/iptm1k0x/image/upload/popstar_black_red.png",
    description: "Visual transmission — placeholder file.",
    access: "public"
  },
  {
    id: "005",
    tag: "N°005",
    name: "GUNSTAR_N005",
    division: "ARCHIVE",
    status: "UNVERIFIED",
    format: "1333 × 2000",
    src: "https://res.cloudinary.com/iptm1k0x/image/upload/stoptalkingdraw.png",
    description: "Visual transmission — placeholder file.",
    access: "public"
  },
  {
    id: "006",
    tag: "N°006",
    name: "GUNSTAR_N006",
    division: "ARCHIVE",
    status: "UNVERIFIED",
    format: "1333 × 2000",
    src: "https://res.cloudinary.com/iptm1k0x/image/upload/popstar_white_red.png",
    description: "Visual transmission — placeholder file.",
    access: "public"
  },
  {
    id: "007",
    tag: "N°007",
    name: "GUNSTAR_N007",
    division: "ARCHIVE",
    status: "UNVERIFIED",
    format: "1333 × 2000",
    src: "https://res.cloudinary.com/iptm1k0x/image/upload/stop_talking.png",
    description: "Visual transmission — placeholder file.",
    access: "public"
  },
  {
    id: "008",
    tag: "N°008",
    name: "GUNSTAR_N008",
    division: "ARCHIVE",
    status: "UNVERIFIED",
    format: "1333 × 2000",
    src: "https://res.cloudinary.com/iptm1k0x/image/upload/gunsatr_december.png",
    description: "Visual transmission — placeholder file.",
    access: "public"
  }
  
];
