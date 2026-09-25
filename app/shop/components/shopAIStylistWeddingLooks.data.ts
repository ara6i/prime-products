export type ShopStylistGender = "women" | "men";
export type ShopWeddingRole =
  | "bride"
  | "bridesmaid"
  | "mother"
  | "groom"
  | "usher";

export interface ShopAIStylistWeddingLook {
  gender: ShopStylistGender;
  role: ShopWeddingRole;
  position: number;
  title: string;
  outfit: string;
  image: string;
  personRule: "fixed" | "rotating";
}

export interface ShopWeddingStageComposition {
  alt: readonly string[];
  images: readonly string[];
  imageScales?: readonly number[];
  label: string;
  visiblePeople: number;
}

const BRIDE_LOOKS = [
  {
    title: "Floral Ballgown",
    outfit:
      "ivory floral-applique ballgown, fingertip veil, pearl earrings, and ivory pumps",
    image:
      "/media/global-shop/ai-stylist-wedding-v2/women/bride/bride-01-floral-ballgown.webp",
  },
  {
    title: "Architectural Mikado",
    outfit:
      "ivory architectural mikado column gown with an asymmetric neckline, long sleeves, and a chapel train",
    image:
      "/media/global-shop/ai-stylist-wedding-v2/women/bride/bride-02-architectural-mikado.png",
  },
  {
    title: "Silk Crepe",
    outfit:
      "ivory silk-crepe gown with a bateau neckline, sheer sleeves, pearl waist detail, and soft train",
    image:
      "/media/global-shop/ai-stylist-wedding-v2/women/bride/bride-03-silk-crepe.png",
  },
  {
    title: "Square Neck Cape",
    outfit:
      "ivory square-neck corseted gown with a pleated A-line skirt and removable sheer shoulder cape",
    image:
      "/media/global-shop/ai-stylist-wedding-v2/women/bride/bride-04-square-neck-cape.png",
  },
  {
    title: "Lace Column",
    outfit:
      "ivory high-neck lace column gown with fitted sleeves, covered buttons, and a short veil",
    image:
      "/media/global-shop/ai-stylist-wedding-v2/women/bride/bride-05-lace-column.png",
  },
] as const;

const GROOM_LOOKS = [
  {
    title: "Black Barathea",
    outfit:
      "black wool barathea tuxedo, pleated white tuxedo shirt, black bow tie, and polished wholecut shoes",
    image:
      "/media/global-shop/ai-stylist-men-v2/groom/groom-01-black-tuxedo.png",
  },
  {
    title: "Ivory Dinner Jacket",
    outfit:
      "ivory silk dinner jacket with black shawl collar, black trousers, black bow tie, and polished loafers",
    image:
      "/media/global-shop/ai-stylist-men-v2/groom/groom-02-ivory-dinner-jacket.png",
  },
  {
    title: "Espresso Three-Piece",
    outfit:
      "deep espresso three-piece wedding suit, ivory shirt, tonal silk tie, cream boutonniere, and brown cap-toe shoes",
    image:
      "/media/global-shop/ai-stylist-men-v2/groom/groom-03-espresso-three-piece.png",
  },
  {
    title: "Warm Taupe Double-Breasted",
    outfit:
      "warm taupe double-breasted wedding suit, white shirt, chocolate knit tie, cream pocket square, and brown derbies",
    image:
      "/media/global-shop/ai-stylist-men-v2/groom/groom-04-warm-taupe-double-breasted.png",
  },
  {
    title: "Midnight Velvet",
    outfit:
      "midnight-blue velvet tuxedo jacket, white tuxedo shirt, black bow tie, black trousers, and polished shoes",
    image:
      "/media/global-shop/ai-stylist-men-v2/groom/groom-05-midnight-velvet.png",
  },
] as const;

const BRIDESMAID_IMAGES = [
  "/media/global-shop/ai-stylist-wedding-v1/women/bridesmaid/disc-bridesmaid-bouquet-1-v2.webp",
  "/media/global-shop/ai-stylist-wedding-v1/women/bridesmaid/disc-bridesmaid-bouquet-2-v2.webp",
  "/media/global-shop/ai-stylist-wedding-v1/women/bridesmaid/disc-bridesmaid-bouquet-3-v2.webp",
  "/media/global-shop/ai-stylist-wedding-v2/women/bridesmaid/bridesmaid-04-dusty-blush.png",
] as const;

const USHER_IMAGES = [
  "/media/global-shop/ai-stylist-wedding-v1/men/usher/disc-usher-charcoal-v1.webp",
  "/media/global-shop/ai-stylist-wedding-v1/men/usher/disc-usher-charcoal-east-asian-v2.webp",
  "/media/global-shop/ai-stylist-wedding-v1/men/usher/disc-usher-charcoal-mediterranean-v2.webp",
  "/media/global-shop/ai-stylist-wedding-v1/men/usher/disc-usher-charcoal-south-asian-v2.webp",
] as const;

const MOTHER_OF_BRIDE_IMAGE =
  "/media/global-shop/ai-stylist-wedding-v2/women/mother/mother-of-bride-muted-mauve.png";
const MOTHER_OF_GROOM_IMAGE =
  "/media/global-shop/ai-stylist-wedding-v2/men/mother/mother-of-groom-aubergine.png";

const BRIDESMAID_LOOKS = [BRIDE_LOOKS[0].image, ...BRIDESMAID_IMAGES].map(
  (image, index) => ({
    gender: "women" as const,
    role: "bridesmaid" as const,
    position: index + 1,
    title:
      index === 0
        ? "Bride Center"
        : `Bridesmaid ${String(index).padStart(2, "0")}`,
    outfit:
      index === 0
        ? BRIDE_LOOKS[0].outfit
        : "matching dusty-blush satin one-shoulder bridesmaid gown, pearl earrings, nude heels, and blush-and-ivory bouquet",
    image,
    personRule: index === 0 ? ("fixed" as const) : ("rotating" as const),
  }),
);

const USHER_LOOKS = [GROOM_LOOKS[0].image, ...USHER_IMAGES].map(
  (image, index) => ({
    gender: "men" as const,
    role: "usher" as const,
    position: index + 1,
    title:
      index === 0 ? "Groom Center" : `Usher ${String(index).padStart(2, "0")}`,
    outfit:
      index === 0
        ? GROOM_LOOKS[0].outfit
        : "matching charcoal usher suit, crisp white shirt, slim black tie, and polished black shoes",
    image,
    personRule: index === 0 ? ("fixed" as const) : ("rotating" as const),
  }),
);

export const SHOP_AI_STYLIST_WEDDING_LOOKS = [
  ...BRIDE_LOOKS.map((look, index) => ({
    gender: "women" as const,
    role: "bride" as const,
    position: index + 1,
    ...look,
    personRule: "fixed" as const,
  })),
  ...BRIDESMAID_LOOKS,
  ...Array.from({ length: 5 }, (_, index) => ({
    gender: "women" as const,
    role: "mother" as const,
    position: index + 1,
    title: "Bride & Mother",
    outfit:
      "the bride in her ivory floral ballgown beside her mother in a muted-mauve formal silk-crepe dress",
    image: MOTHER_OF_BRIDE_IMAGE,
    personRule: "fixed" as const,
  })),
  ...GROOM_LOOKS.map((look, index) => ({
    gender: "men" as const,
    role: "groom" as const,
    position: index + 1,
    ...look,
    personRule: "fixed" as const,
  })),
  ...USHER_LOOKS,
  ...Array.from({ length: 5 }, (_, index) => ({
    gender: "men" as const,
    role: "mother" as const,
    position: index + 1,
    title: "Groom & Mother",
    outfit:
      "the groom in his black barathea tuxedo beside his mother in a deep-aubergine formal silk-crepe dress",
    image: MOTHER_OF_GROOM_IMAGE,
    personRule: "fixed" as const,
  })),
] as const satisfies readonly ShopAIStylistWeddingLook[];

export const SHOP_WEDDING_ROLE_OPTIONS = {
  women: [
    { id: "bride", label: "Bride" },
    { id: "bridesmaid", label: "Bridesmaid" },
    { id: "mother", label: "Mother of bride" },
  ],
  men: [
    { id: "groom", label: "Groom" },
    { id: "usher", label: "Usher" },
    { id: "mother", label: "Mother of groom" },
  ],
} as const;

const WEDDING_STAGE_COMPOSITIONS: Partial<
  Record<`${ShopStylistGender}:${ShopWeddingRole}`, ShopWeddingStageComposition>
> = {
  "women:bridesmaid": {
    label: "Bride centered with four bridesmaids in one matching dress",
    visiblePeople: 5,
    images: [BRIDE_LOOKS[0].image, ...BRIDESMAID_IMAGES],
    alt: [
      "Bride centered in an ivory floral wedding gown",
      ...BRIDESMAID_IMAGES.map(
        (_, index) =>
          `Bridesmaid ${index + 1} in the matching dusty-blush satin gown`,
      ),
    ],
  },
  "women:mother": {
    label: "Bride with only her mother beside her",
    visiblePeople: 2,
    images: [BRIDE_LOOKS[0].image, MOTHER_OF_BRIDE_IMAGE, "", "", ""],
    alt: [
      "Bride in an ivory floral wedding gown",
      "Mother of the bride in a muted-mauve formal dress",
      "",
      "",
      "",
    ],
  },
  "men:usher": {
    label: "Groom centered with four ushers in one matching suit",
    visiblePeople: 5,
    images: [GROOM_LOOKS[0].image, ...USHER_IMAGES],
    // The groom source has a wider canvas than the usher cutouts. Compensate
    // only in this party view so the centered groom remains the visual anchor.
    imageScales: [1.15, 1, 1, 1, 1],
    alt: [
      "Groom centered in a black barathea tuxedo",
      ...USHER_IMAGES.map(
        (_, index) => `Usher ${index + 1} in the matching charcoal suit`,
      ),
    ],
  },
  "men:mother": {
    label: "Groom with only his mother beside him",
    visiblePeople: 2,
    images: [GROOM_LOOKS[0].image, MOTHER_OF_GROOM_IMAGE, "", "", ""],
    alt: [
      "Groom in a black barathea tuxedo",
      "Mother of the groom in a deep-aubergine formal dress",
      "",
      "",
      "",
    ],
  },
};

export function getWeddingRoleLooks(
  gender: ShopStylistGender,
  role: ShopWeddingRole,
) {
  const looks = SHOP_AI_STYLIST_WEDDING_LOOKS.filter(
    (look) => look.gender === gender && look.role === role,
  );
  if (looks.length !== 5) {
    throw new Error(`Wedding scenario ${gender}/${role} requires five looks.`);
  }
  return looks;
}

export function getWeddingStageComposition(
  gender: ShopStylistGender,
  role: ShopWeddingRole,
) {
  return WEDDING_STAGE_COMPOSITIONS[`${gender}:${role}`] ?? null;
}

export const SHOP_BASE_SCENARIO_COUNT = 38;
export const SHOP_BUDGET_SCENARIO_COUNT = 114;
