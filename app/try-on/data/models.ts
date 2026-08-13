export const FULL_BODY_MODELS = [
  { id: "1", src: "/images/models/model-1.png", alt: "Male model in denim jacket" },
  { id: "2", src: "/images/models/model-2.png", alt: "Male model in black tee" },
  { id: "3", src: "/images/models/model-3.png", alt: "Male model in blue shirt" },
  { id: "4", src: "/images/models/model-4.png", alt: "Female model in white tee" },
  { id: "5", src: "/images/models/model-5.png", alt: "Female model in cream sweater" },
  { id: "6", src: "/images/models/model-6.png", alt: "Female model in black pants" },
  { id: "7", src: "/images/models/model-7.png", alt: "Female model in jeans" },
  { id: "8", src: "/images/models/model-8.png", alt: "Female model in blazer" },
];

export const CLOSE_UP_MODELS = [
  { id: "c1", src: "/images/models/closeup-1.png", alt: "Close-up model 1" },
  { id: "c2", src: "/images/models/closeup-2.png", alt: "Close-up model 2" },
  { id: "c3", src: "/images/models/closeup-3.png", alt: "Close-up model 3" },
  { id: "c4", src: "/images/models/closeup-4.png", alt: "Close-up model 4" },
];

export const MODEL_IMAGES: Record<string, string> = Object.fromEntries(
  [...FULL_BODY_MODELS, ...CLOSE_UP_MODELS].map((m) => [m.id, m.src]),
);
