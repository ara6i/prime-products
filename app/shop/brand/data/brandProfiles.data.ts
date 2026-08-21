import type { BrandCatalog } from "../types/brandCatalog.types";

export const shopBrandProfiles: Array<Omit<BrandCatalog, "products">> = [
  {
    id: "judy-blue",
    name: "Judy Blue",
    shortName: "JUDY BLUE",
    logo: "https://www.judybluejeans.com/cdn/shop/files/Judy_Blue_Logo.svg?v=1760643303&width=600",
    descriptor:
      "Size-inclusive denim designed around comfort, confidence, and fit.",
  },
  {
    id: "zenana",
    name: "Zenana",
    shortName: "ZENANA",
    logo: "https://www.ezenana.com/images/custom/images/logo.png",
    descriptor:
      "Los Angeles essentials balancing comfort, versatility, and value.",
  },
  {
    id: "bibi",
    name: "BIBI",
    shortName: "BIBI",
    logo: "https://bibiclothing.com/cdn/shop/files/company_logo-1000x500px.png?v=1727213665&width=600",
    descriptor: "Feminine Los Angeles fashion with playful color and detail.",
  },
  {
    id: "umgee",
    name: "Umgee USA",
    shortName: "UMGEE",
    descriptor:
      "Contemporary womenswear with a distinctive bohemian point of view.",
  },
  {
    id: "hyfve",
    name: "HYFVE",
    shortName: "HYFVE",
    logo: "https://www.hyfve.com/cdn/shop/files/hyfve_wholesale_logo_4-01_ef5652ed-f0b0-4035-a046-801f75d34f67.svg?v=1729033023&width=600",
    descriptor: "Trend-aware contemporary pieces made for modern wardrobes.",
  },
  {
    id: "heimish",
    name: "Heimish",
    shortName: "HEIMISH",
    logo: "https://heimishusa.com/logo.png",
    descriptor:
      "Relaxed young-contemporary styles with easy everyday versatility.",
  },
  {
    id: "bombom",
    name: "BOMBOM USA",
    shortName: "BOMBOM",
    logo: "https://bombomusa.com/cdn/shop/files/Bombom-logo.png?v=1761555883&width=600",
    descriptor:
      "Comfort-led apparel focused on soft fabrics and wearable silhouettes.",
  },
  {
    id: "davi-dani",
    name: "Davi & Dani",
    shortName: "DAVI & DANI",
    logo: "https://www.davidani.com/images/thumbs/0000273_dvdn_logo_image.png",
    descriptor: "Size-inclusive contemporary fashion designed in Los Angeles.",
  },
];
