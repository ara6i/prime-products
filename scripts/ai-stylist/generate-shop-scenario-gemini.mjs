import {
  copyFileSync,
  closeSync,
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { pathToFileURL } from "node:url";
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";

const ROOT = process.cwd();
const GENDER = process.argv.find((value) => value.startsWith("--gender="))?.slice("--gender=".length) || "female";
if (GENDER !== "female" && GENDER !== "male") {
  throw new Error(`Unsupported gender: ${GENDER}`);
}
const IS_MALE = GENDER === "male";
const MODEL = "gemini-3-pro-image";
const RUN_DIR = path.join(
  ROOT,
  IS_MALE
    ? "output/reports/shop-ai-stylist-mens-gemini-80-20260924"
    : "output/reports/shop-ai-stylist-gemini-80-20260923",
);
const EXTERNAL_VOLUME = "/Volumes/PrimeStorage";
const BULK_DIR = path.join(
  EXTERNAL_VOLUME,
  IS_MALE
    ? "PrimeStyleAI/shop-ai-stylist-mens-gemini-80-20260924"
    : "PrimeStyleAI/shop-ai-stylist-gemini-80-20260923",
);
const REFERENCE_DIR = path.join(RUN_DIR, "references");
const SAMPLE_DIR = path.join(RUN_DIR, "sample");
const RAW_DIR = path.join(BULK_DIR, "raw");
const ALPHA_DIR = path.join(BULK_DIR, "alpha");
const QA_DIR = path.join(BULK_DIR, "qa");
const PUBLIC_DIR = path.join(
  ROOT,
  IS_MALE
    ? "public/media/global-shop/ai-stylist-scenarios-men-v1"
    : "public/media/global-shop/ai-stylist-scenarios-v1",
);
const PUBLIC_WEB_DIR = IS_MALE
  ? "/media/global-shop/ai-stylist-scenarios-men-v1"
  : "/media/global-shop/ai-stylist-scenarios-v1";
const MEN_DATA_PATH = path.join(
  ROOT,
  "app/shop/components/shopAIStylistScenarioMensLooks.data.ts",
);
const RESPONSE_DIR = path.join(BULK_DIR, "responses");
const JOBS_PATH = path.join(RUN_DIR, "jobs.json");
const SPEND_LOCK_PATH = path.join(RUN_DIR, "spend-lock.json");
const STATUS_PATH = path.join(RUN_DIR, "status.json");
const REQUESTS_PATH = path.join(RUN_DIR, "request-manifest.json");
const BACKEND_ENV_PATH = path.resolve(ROOT, "../primeStyleAI-backend/.env");
const MAX_INLINE_BYTES = 18 * 1024 * 1024;
// Explicitly authorized by the user for the missing men's scenario batch on 2026-09-24.
const PAID_GENERATION_ENABLED = true;
const backendRequire = createRequire(
  path.resolve(ROOT, "../primeStyleAI-backend/package.json"),
);
const BACKGROUND_REMOVAL_PUBLIC_PATH = `${pathToFileURL(
  path.resolve(
    ROOT,
    "../primeStyleAI-backend/node_modules/@imgly/background-removal-node/dist",
  ),
).href}/`;

function assertPaidGenerationUnlocked(mode) {
  if (!PAID_GENERATION_ENABLED) {
    throw new Error(
      `Paid Gemini ${mode} is hard-disabled in this script. ` +
        "Polling, downloading, extracting, cutout creation, QA, and promotion remain available.",
    );
  }
  if (!existsSync(SPEND_LOCK_PATH)) return;
  const lock = JSON.parse(readFileSync(SPEND_LOCK_PATH, "utf8"));
  throw new Error(
    `Paid Gemini ${mode} is locked: ${lock.reason || "spend cap reached"}. ` +
      "Polling, downloading, extracting, cutout creation, QA, and promotion remain available.",
  );
}

function assertExternalStorageAvailable() {
  if (!existsSync(EXTERNAL_VOLUME)) {
    throw new Error(
      `External bulk storage is unavailable at ${EXTERNAL_VOLUME}; refusing to use the nearly-full Mac disk.`,
    );
  }
  mkdirSync(BULK_DIR, { recursive: true });
}

const ORIGINAL_REFERENCES = IS_MALE
  ? [
      "public/media/global-shop/arc-jacket-demo-v2/model-source.png",
      "public/media/global-shop/arc-jacket-demo-v2/model-source.png",
      "public/media/global-shop/arc-jacket-demo-v2/model-source.png",
      "public/media/global-shop/arc-jacket-demo-v2/model-source.png",
      "public/media/global-shop/arc-jacket-demo-v2/model-source.png",
    ]
  : [
      "public/media/global-shop/ai-stylist-disc/look-05-violet-tailoring.png",
      "public/media/global-shop/ai-stylist-disc/look-01-cobalt-dress.png",
      "public/media/global-shop/ai-stylist-disc/look-02-coral-jumpsuit.png",
      "public/media/global-shop/ai-stylist-disc/look-03-red-skirt.png",
      "public/media/global-shop/ai-stylist-disc/look-04-emerald-dress.png",
    ];

const WOMEN_OUTFITS = {
  everyday: {
    Spring: [
      ["Sage Weekend", "soft sage cardigan over an ivory fitted tank, clean straight-leg medium-blue jeans, tan leather loafers, and a small camel shoulder bag"],
      ["Blue-Sky Layers", "powder-blue cropped trench over a crisp white tee, cream tailored ankle trousers, white leather sneakers, and a structured pale-blue mini bag"],
      ["Coral Garden", "coral fine-knit polo with an ecru A-line midi skirt, nude ballet flats, and a woven tan handbag"],
      ["Lilac Utility", "lilac utility jacket over a champagne satin shell, dark-indigo straight jeans, taupe loafers, and a compact cream crossbody"],
      ["Butter Morning", "butter-yellow cardigan over a blue-and-white striped shirt, stone straight chinos, clean ivory sneakers, and a soft tan tote"],
    ],
    Summer: [
      ["Turquoise Linen", "turquoise linen button-up with sleeves softly rolled, tailored white shorts, caramel flat sandals, and a woven mini tote"],
      ["Coral Ease", "coral sleeveless linen midi dress with a slim woven belt, natural espadrilles, and a cream basket bag"],
      ["Cobalt Coast", "cobalt square-neck tank with sand wide-leg linen trousers, tan slide sandals, and a small white shoulder bag"],
      ["White Poplin Day", "crisp white cotton poplin midi dress with an emerald mini bag, delicate gold jewelry, and flat tan sandals"],
      ["Emerald Denim", "emerald ribbed sleeveless knit top with a light-wash denim midi skirt, white low-profile sneakers, and a coral crossbody"],
    ],
    Fall: [
      ["Rust & Indigo", "rust suede cropped jacket over a cream ribbed knit, indigo straight jeans, cognac ankle boots, and a structured tan bag"],
      ["Teal Saturday", "deep-teal cardigan over an ivory blouse, camel tailored trousers, brown penny loafers, and a burgundy shoulder bag"],
      ["Berry Knit", "berry rib-knit midi dress with a slim cognac belt, chocolate ankle boots, and a small camel top-handle bag"],
      ["Olive City", "olive utility jacket over an aubergine knit top, clean dark-denim straight jeans, oxblood loafers, and a taupe crossbody"],
      ["Cobalt Plaid", "cobalt crew-neck sweater with a camel-and-blue plaid midi skirt, chocolate knee boots, and a burgundy mini bag"],
    ],
    Winter: [
      ["Camel Cobalt", "long camel wool coat over a cobalt turtleneck, dark-indigo straight jeans, chocolate ankle boots, and a structured burgundy bag"],
      ["Ivory Alpine", "cropped ivory puffer over an emerald merino knit, charcoal straight trousers, cream winter sneakers, and a teal crossbody"],
      ["Berry Warmth", "berry wool coat over a cream sweater dress, cognac knee boots, and a camel top-handle bag"],
      ["Navy & Coral", "navy tailored wool coat over a soft-gray knit and matching straight trousers, coral scarf, oxblood loafers, and a structured cream bag"],
      ["Forest Layers", "forest-green belted cardigan over a white poplin shirt, chocolate wool trousers, cognac ankle boots, and a warm-tan tote"],
    ],
  },
  work: {
    Spring: [
      ["Lilac Authority", "lilac single-breasted blazer over a white silk blouse, cream tailored straight trousers, nude pointed pumps, and a structured taupe work bag"],
      ["Sage Direction", "sage belted midi dress with refined long sleeves, tan leather loafers, pearl earrings, and a structured cream handbag"],
      ["Skyline Suiting", "sky-blue blazer over an ivory shell, navy straight trousers, pale-gray pointed pumps, and a structured cobalt bag"],
      ["Coral Briefing", "coral silk blouse with a camel A-line midi skirt, tan block heels, and a cream top-handle work bag"],
      ["Ivory & Green", "ivory textured cropped jacket over a champagne shell, emerald tailored trousers, tan loafers, and a structured cognac bag"],
    ],
    Summer: [
      ["Powder-Blue Set", "powder-blue sleeveless tailored vest with matching straight trousers, cream pointed slingbacks, and a structured white mini briefcase"],
      ["Emerald Office", "emerald short-sleeve midi shirt dress with a slim tan belt, cognac slingbacks, and a structured cream handbag"],
      ["Coral Linen", "white linen blazer over a coral silk shell, sand tailored trousers, tan mules, and a soft camel work tote"],
      ["Cobalt Wrap", "cobalt short-sleeve wrap midi dress, nude low heels, delicate gold jewelry, and a structured ivory bag"],
      ["Champagne Teal", "champagne silk blouse with a deep-teal tailored midi skirt, tan pointed pumps, and a structured burgundy handbag"],
    ],
    Fall: [
      ["Burgundy Leadership", "burgundy blazer over an ivory silk blouse, camel straight trousers, oxblood loafers, and a structured cream work bag"],
      ["Teal Focus", "deep-teal long-sleeve knit midi dress with a chocolate belt, brown ankle boots, and a structured cognac bag"],
      ["Rust Strategy", "rust tailored blazer over a cream fine-knit turtleneck, navy straight trousers, tan pointed pumps, and a camel work tote"],
      ["Plum Portfolio", "plum silk blouse with an olive tailored midi skirt, oxblood pumps, and a structured taupe handbag"],
      ["Cobalt Trench", "camel trench over a cobalt blouse, stone tailored trousers, chocolate loafers, and a burgundy top-handle bag"],
    ],
    Winter: [
      ["Evergreen Executive", "deep-green wool blazer and straight trousers over an ivory silk blouse, chocolate pointed pumps, and a structured camel work bag"],
      ["Camel & Berry", "camel wool coat over a berry long-sleeve knit midi dress, cognac knee boots, and a structured cream handbag"],
      ["Cobalt Precision", "cobalt blazer over a soft-gray turtleneck, cream wool trousers, oxblood loafers, and a structured navy bag"],
      ["Burgundy Suit", "burgundy wool trouser suit over a blush silk blouse, nude pointed pumps, and a structured taupe briefcase"],
      ["Ivory Texture", "ivory textured jacket over a champagne shell, chocolate tailored trousers, cognac ankle boots, and a structured burgundy work bag"],
    ],
  },
  "date-night": {
    Spring: [
      ["Blush Twilight", "blush satin slip midi dress with a cropped ivory jacket, nude strappy sandals, pearl drop earrings, and a champagne clutch"],
      ["Lavender Hour", "lavender wrap midi dress with soft draping, silver strappy heels, crystal earrings, and a small silver clutch"],
      ["Emerald Bloom", "emerald silk blouse with a cream satin midi skirt, gold heeled sandals, and a compact coral clutch"],
      ["Coral Confidence", "coral asymmetric tailored jumpsuit with a defined waist, gold sandals, sculptural gold earrings, and a cobalt mini bag"],
      ["Cobalt Romance", "cobalt off-shoulder satin midi dress, silver heels, crystal earrings, and a blush clutch"],
    ],
    Summer: [
      ["Ruby Sunset", "ruby-red satin slip midi dress, gold strappy sandals, delicate gold earrings, and a small champagne clutch"],
      ["Turquoise Moon", "turquoise halter-neck midi dress with fluid drape, nude heeled sandals, gold hoops, and a cream mini bag"],
      ["Cobalt Satin", "white one-shoulder fitted top with a cobalt satin midi skirt, silver sandals, and a coral clutch"],
      ["Coral Afterglow", "coral draped one-shoulder mini dress with elegant coverage, nude heels, gold earrings, and a cobalt mini bag"],
      ["Emerald Night", "emerald asymmetric tailored jumpsuit with a defined waist, gold heels, crystal earrings, and a champagne clutch"],
    ],
    Fall: [
      ["Burgundy Velvet", "burgundy velvet midi dress with a refined square neckline, gold earrings, oxblood pumps, and a champagne clutch"],
      ["Rust Satin", "rust satin blouse with a dark-teal midi skirt, cognac heels, sculptural gold earrings, and a camel clutch"],
      ["Plum Embrace", "plum off-shoulder long-sleeve knit midi dress, chocolate heeled boots, gold earrings, and a warm-ivory mini bag"],
      ["Cobalt Evening", "cobalt long-sleeve wrap midi dress, gold pointed pumps, delicate gold jewelry, and a burgundy clutch"],
      ["Oxblood Glow", "champagne silk blouse with an oxblood leather-look midi skirt, chocolate pumps, crystal earrings, and a compact camel bag"],
    ],
    Winter: [
      ["Emerald Velvet", "emerald long-sleeve velvet midi dress, crystal drop earrings, metallic silver pumps, and a silver clutch"],
      ["Ruby Frost", "ruby satin midi dress with an ivory faux-fur capelet, gold heels, crystal earrings, and a champagne clutch"],
      ["Cobalt Candlelight", "cobalt long-sleeve satin wrap midi dress, silver pointed pumps, crystal earrings, and an ivory clutch"],
      ["Burgundy Snow", "ivory silk long-sleeve top with a burgundy velvet midi skirt, gold pumps, pearl earrings, and a champagne clutch"],
      ["Plum Tuxedo", "plum tailored trouser suit over a champagne satin camisole, metallic heels, sculptural gold earrings, and a small ivory bag"],
    ],
  },
  event: {
    Spring: [
      ["Lavender Pleats", "lavender pleated floor-length gown with a defined waist, silver sandals, crystal earrings, and a silver clutch"],
      ["Emerald Ceremony", "emerald satin midi dress with architectural draping, gold heels, refined gold jewelry, and a champagne clutch"],
      ["Coral Gala", "coral draped floor-length gown with an elegant asymmetric neckline, nude heels, gold earrings, and a cobalt clutch"],
      ["Powder-Blue Arrival", "powder-blue tailored wide-leg jumpsuit with a defined waist, silver heels, crystal earrings, and an ivory clutch"],
      ["Garden Muse", "ivory-ground floral midi dress with lavender, coral, and green botanical print, nude heels, pearl earrings, and a sage clutch"],
    ],
    Summer: [
      ["Cobalt Spotlight", "cobalt one-shoulder floor-length gown with fluid satin drape, silver sandals, crystal earrings, and a silver clutch"],
      ["Coral Horizon", "coral halter-neck maxi dress with a clean flowing silhouette, gold sandals, gold earrings, and a turquoise clutch"],
      ["Emerald Statement", "emerald silk wide-leg jumpsuit with a sculpted neckline, gold heels, crystal earrings, and a champagne clutch"],
      ["Sunlit Pleats", "marigold-yellow pleated midi dress with a defined waist, nude heels, gold jewelry, and a cobalt clutch"],
      ["Fuchsia Celebration", "fuchsia asymmetric floor-length gown with clean draping, silver heels, crystal earrings, and an ivory clutch"],
    ],
    Fall: [
      ["Rust Grandeur", "rust satin floor-length gown with refined long sleeves and a defined waist, gold heels, gold earrings, and a teal clutch"],
      ["Burgundy Premiere", "burgundy velvet floor-length gown with an elegant square neckline, metallic heels, crystal earrings, and a champagne clutch"],
      ["Teal Reception", "deep-teal one-shoulder midi dress with architectural draping, gold pumps, gold earrings, and a camel clutch"],
      ["Plum Modernist", "plum tailored wide-leg jumpsuit with a satin lapel and defined waist, metallic heels, crystal earrings, and an ivory clutch"],
      ["Bronze Light", "warm-bronze long-sleeve satin gown with clean column drape, oxblood heels, gold earrings, and a burgundy clutch"],
    ],
    Winter: [
      ["Cobalt Crystal", "cobalt floor-length gown with subtle crystal shoulder detailing and elegant long sleeves, silver heels, crystal earrings, and a silver clutch"],
      ["Emerald Velvet Gala", "emerald velvet floor-length gown with a refined off-shoulder neckline, metallic heels, crystal jewelry, and a champagne clutch"],
      ["Ruby Grand Entrance", "ruby-red satin floor-length gown with sculptural draping, gold heels, crystal earrings, and an ivory clutch"],
      ["Plum Starlight", "plum long-sleeve sequin midi dress with a clean fitted silhouette, metallic heels, crystal earrings, and a silver clutch"],
      ["Midnight Tuxedo", "midnight-navy tuxedo-inspired wide-leg jumpsuit with a silver satin lapel, silver heels, crystal earrings, and a cobalt clutch"],
    ],
  },
};

const MEN_OUTFITS = {
  everyday: {
    Spring: [
      ["Slate Weekend", "slate-blue cotton overshirt over a clean white heavyweight tee, ecru straight-leg chinos, white leather court sneakers, and a dark-brown crossbody"],
      ["Olive City", "matte olive bomber over a cream fine-knit crewneck, navy tailored straight trousers, chocolate suede sneakers, and a steel watch"],
      ["Indigo Shift", "mid-blue cropped denim jacket over a soft-gray tee, washed-black straight jeans, black-and-white low-profile sneakers, and slim black sunglasses"],
      ["Camel Layers", "camel knit cardigan over a pale-blue Oxford shirt, stone pleated trousers with a clean straight leg, brown penny loafers, and a dark-tan tote"],
      ["Cobalt Motion", "cobalt lightweight shell over an ivory jersey tee, charcoal tapered technical trousers, gray running sneakers, and a compact black sling bag"],
    ],
    Summer: [
      ["White Linen", "white open-collar linen shirt with sleeves softly rolled, tobacco tailored shorts ending above the knee, caramel leather sandals, and tortoiseshell sunglasses"],
      ["Sea-Blue Polo", "sea-blue textured knit polo, cream straight linen trousers, white suede sneakers, and a woven sand tote"],
      ["Sage Resort", "sage camp-collar shirt over a white ribbed tank, navy tailored shorts, dark-brown leather slides, and a slim silver watch"],
      ["Terracotta Ease", "terracotta short-sleeve linen shirt, ecru drawstring trousers with a clean straight silhouette, cream canvas sneakers, and amber sunglasses"],
      ["Black Minimal", "black fine-knit short-sleeve polo, light-stone tailored trousers, polished black loafers, and a compact charcoal shoulder bag"],
    ],
    Fall: [
      ["Tobacco Suede", "tobacco suede trucker jacket over an ivory merino crewneck, dark-indigo straight jeans, chocolate ankle boots, and a brown leather messenger"],
      ["Forest Corduroy", "forest-green corduroy overshirt over a heather-gray tee, charcoal pleated trousers, burgundy sneakers, and a brushed-steel watch"],
      ["Oxblood Knit", "oxblood zip cardigan over a pale-blue shirt, sand straight chinos, dark-brown loafers, and a navy soft briefcase"],
      ["Navy Utility", "navy chore jacket over a cream mock-neck knit, olive tailored fatigue trousers, tan suede sneakers, and a dark-green sling bag"],
      ["Charcoal Monochrome", "charcoal wool overshirt over a black crewneck, graphite straight jeans, black leather sneakers, and matte-black sunglasses"],
    ],
    Winter: [
      ["Camel Overcoat", "long camel wool overcoat over a charcoal turtleneck, dark-navy straight trousers, chocolate Chelsea boots, and a structured brown messenger"],
      ["Evergreen Puffer", "deep-green cropped puffer over an ivory cable-knit sweater, black straight jeans, cream winter sneakers, and a charcoal beanie"],
      ["Navy Shearling", "navy shearling-collar jacket over a rust merino knit, stone wool trousers, dark-brown lace-up boots, and a cognac weekender"],
      ["Graphite Layers", "graphite belted wool coat over a black hoodie, charcoal tailored trousers, black leather high-top sneakers, and a steel watch"],
      ["Burgundy Warmth", "burgundy quilted jacket over a soft-gray roll-neck, dark-indigo jeans, oxblood boots, and a warm-tan crossbody"],
    ],
  },
  work: {
    Spring: [
      ["Sage Briefing", "sage unstructured blazer over a crisp white shirt, navy tailored straight trousers, brown penny loafers, and a cognac briefcase"],
      ["Blue Direction", "powder-blue overshirt jacket over an ivory knit polo, charcoal pleated trousers, dark-brown loafers, and a navy work tote"],
      ["Stone Suiting", "stone single-breasted suit with a pale-blue shirt and no tie, chocolate derby shoes, a brown belt, and a silver watch"],
      ["Navy Precision", "navy blazer over a white Oxford shirt, ecru tailored trousers, oxblood loafers, and a structured dark-brown briefcase"],
      ["Olive Strategy", "muted-olive chore blazer over a cream fine-knit polo, black tailored trousers, black leather loafers, and a charcoal laptop bag"],
    ],
    Summer: [
      ["Sand Linen Suit", "sand linen-blend suit over a white open-collar shirt, dark-brown loafers without visible socks, and a slim tan portfolio"],
      ["Sky Office", "sky-blue short-sleeve knit polo, navy tailored trousers, white leather sneakers, and a structured charcoal work bag"],
      ["Cream Executive", "cream lightweight blazer over a slate-blue crewneck knit, tobacco pleated trousers, brown suede loafers, and a steel watch"],
      ["Cobalt Meeting", "cobalt unstructured blazer over a white poplin shirt, light-gray trousers, black leather loafers, and a black briefcase"],
      ["Teal Focus", "deep-teal fine-knit polo, stone tailored straight trousers, dark-brown monk straps, and a chocolate leather document bag"],
    ],
    Fall: [
      ["Burgundy Leadership", "burgundy wool blazer over an ivory shirt, charcoal trousers, oxblood derby shoes, and a structured dark-brown briefcase"],
      ["Espresso Double-Breasted", "espresso double-breasted blazer over a pale-blue shirt, cream tailored trousers, dark-brown loafers, and a gold-tone watch"],
      ["Forest Boardroom", "forest-green suit over a white shirt with a dark-navy knit tie, black derby shoes, and a black leather portfolio"],
      ["Rust Presentation", "rust herringbone blazer over a cream roll-neck knit, navy trousers, cognac brogues, and a tan briefcase"],
      ["Graphite Modern", "graphite overshirt suit over a black fine-knit crewneck, matching straight trousers, polished black loafers, and a charcoal tote"],
    ],
    Winter: [
      ["Navy Authority", "navy wool suit under a long charcoal overcoat, white shirt, burgundy silk tie, black cap-toe shoes, and a black briefcase"],
      ["Camel Director", "camel overcoat over a deep-brown suit and ivory roll-neck, chocolate leather boots, and a structured cognac work bag"],
      ["Evergreen Executive", "deep-green wool blazer over a pale-gray turtleneck, charcoal trousers, oxblood loafers, and a dark-brown portfolio"],
      ["Burgundy Winter Suit", "burgundy wool suit over a crisp white shirt, charcoal tie, polished black derbies, and a black leather briefcase"],
      ["Charcoal Texture", "charcoal textured jacket over a cream merino knit, black tailored trousers, dark-brown Chelsea boots, and a graphite laptop bag"],
    ],
  },
  "date-night": {
    Spring: [
      ["Cobalt Evening", "cobalt suede bomber over a white knit polo, charcoal tailored trousers, black loafers, and a slim silver watch"],
      ["Sage Afterglow", "sage overshirt over an ivory ribbed knit, black straight trousers, dark-brown suede sneakers, and subtle silver jewelry"],
      ["Terracotta Charm", "terracotta fine-knit polo under a cream lightweight blazer, navy trousers, oxblood loafers, and a chocolate belt"],
      ["Midnight Denim", "midnight denim jacket over a pale-gray tee, black tailored jeans with a straight fit, polished black boots, and a steel watch"],
      ["Lavender Detail", "soft-lavender shirt with an open collar under a charcoal cropped jacket, stone trousers, dark-brown loafers, and a black mini crossbody"],
    ],
    Summer: [
      ["Black Riviera", "black open-knit polo over a tonal tank, cream linen trousers, black leather sandals, and slim dark sunglasses"],
      ["Turquoise Night", "deep-turquoise camp-collar silk shirt, black tailored trousers, black loafers, and a polished silver watch"],
      ["Ivory Sunset", "ivory short-sleeve knit shirt, tobacco pleated trousers, dark-brown suede loafers, and amber sunglasses"],
      ["Cobalt Terrace", "cobalt linen shirt with an open collar, pale-stone straight trousers, white leather sneakers, and a charcoal crossbody"],
      ["Wine Silk", "wine-red fluid short-sleeve shirt, charcoal tailored trousers, polished black loafers, and a slim black belt"],
    ],
    Fall: [
      ["Oxblood Suede", "oxblood suede jacket over a black fine-knit crewneck, charcoal trousers, black Chelsea boots, and a brushed-steel watch"],
      ["Forest Velvet", "forest-green velvet overshirt over an ivory tee, black tailored trousers, dark-brown loafers, and a minimal gold chain"],
      ["Camel Night", "camel cropped wool jacket over a burgundy roll-neck, dark-navy trousers, oxblood boots, and a chocolate leather belt"],
      ["Plum Layers", "plum knit polo under a graphite blazer, black straight trousers, polished black derbies, and a slim silver watch"],
      ["Navy Bistro", "navy suede overshirt over a cream mock neck, tobacco trousers, dark-brown loafers, and a cognac crossbody"],
    ],
    Winter: [
      ["Emerald Velvet", "emerald velvet dinner jacket over a black roll-neck, black tailored trousers, polished black loafers, and a silver watch"],
      ["Burgundy Candlelight", "burgundy wool overcoat over an ivory cable-knit sweater, charcoal trousers, oxblood Chelsea boots, and a dark-brown scarf"],
      ["Cobalt Midnight", "cobalt wool jacket over a black fine-knit polo, black trousers, black leather boots, and a brushed-steel watch"],
      ["Camel Snow", "camel double-breasted overcoat over a chocolate turtleneck, cream wool trousers, dark-brown boots, and a cognac leather bag"],
      ["Monochrome Date", "black textured overcoat over a charcoal mock-neck knit, black straight trousers, polished black derbies, and a slim silver chain"],
    ],
  },
  event: {
    Spring: [
      ["Powder-Blue Ceremony", "powder-blue single-breasted suit with a crisp white shirt, navy silk tie, dark-brown loafers, and a white pocket square"],
      ["Sage Reception", "sage tailored suit over an ivory open-collar shirt, chocolate loafers, and a cream pocket square"],
      ["Cobalt Arrival", "cobalt tuxedo jacket with black satin lapels, black trousers, white tuxedo shirt, black bow tie, and polished black shoes"],
      ["Champagne Tailoring", "champagne dinner jacket with black satin trousers, white shirt, black bow tie, and polished black loafers"],
      ["Forest Formal", "forest-green double-breasted suit with an ivory shirt, dark-brown tie, oxblood derbies, and a cream pocket square"],
    ],
    Summer: [
      ["Ivory Dinner Jacket", "ivory dinner jacket with black satin lapels, black tailored trousers, white tuxedo shirt, black bow tie, and polished black loafers"],
      ["Sky Linen Ceremony", "sky-blue linen suit over a white open-collar shirt, dark-brown loafers, and a white pocket square"],
      ["Midnight Tuxedo", "midnight-navy tuxedo with black satin lapels, white pleated shirt, black bow tie, and patent black shoes"],
      ["Terracotta Formal", "terracotta double-breasted suit over an ivory shirt, chocolate tie, dark-brown loafers, and a cream pocket square"],
      ["Emerald Spotlight", "emerald velvet dinner jacket over a black silk shirt, black tailored trousers, polished black shoes, and a black pocket square"],
    ],
    Fall: [
      ["Burgundy Premiere", "burgundy velvet tuxedo jacket with black satin lapels, black trousers, white shirt, black bow tie, and patent black shoes"],
      ["Espresso Gala", "espresso double-breasted suit over an ivory shirt, black silk tie, polished dark-brown shoes, and a cream pocket square"],
      ["Teal Ceremony", "deep-teal tailored suit over a white shirt, charcoal tie, black loafers, and a white pocket square"],
      ["Rust Black Tie", "rust velvet dinner jacket over a black shirt and black satin trousers, polished black loafers, and a black pocket square"],
      ["Charcoal Classic", "charcoal three-piece suit with a white shirt, burgundy tie, black cap-toe shoes, and a crisp white pocket square"],
    ],
    Winter: [
      ["Midnight Grand", "midnight-black tuxedo under a long charcoal evening coat, white pleated shirt, black bow tie, and patent black shoes"],
      ["Emerald Gala", "emerald velvet dinner jacket with black satin lapels, black trousers, white shirt, black bow tie, and polished black shoes"],
      ["Cobalt Black Tie", "cobalt tuxedo with black satin lapels, white shirt, black bow tie, black tailored trousers, and patent black shoes"],
      ["Burgundy Grand Entrance", "burgundy tuxedo jacket over a black silk shirt, black satin trousers, polished black loafers, and a silver watch"],
      ["Ivory Winter Formal", "ivory dinner jacket under a black wool overcoat, black satin trousers, white shirt, black bow tie, and polished black shoes"],
    ],
  },
};

const OUTFITS = IS_MALE ? MEN_OUTFITS : WOMEN_OUTFITS;

function parseEnvFile(raw) {
  const parsed = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

function getApiKey() {
  const direct = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (direct) return direct;
  if (!existsSync(BACKEND_ENV_PATH)) {
    throw new Error("Gemini environment file is unavailable.");
  }
  const env = parseEnvFile(readFileSync(BACKEND_ENV_PATH, "utf8"));
  const apiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("Gemini API key is unavailable.");
  return apiKey;
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function buildLooks() {
  const looks = [];
  for (const [occasion, seasons] of Object.entries(OUTFITS)) {
    for (const [season, outfits] of Object.entries(seasons)) {
      outfits.forEach(([title, outfit], index) => {
        looks.push({
          occasion,
          season,
          position: index + 1,
          title,
          outfit,
          slug: `${occasion}-${season.toLowerCase()}-${String(index + 1).padStart(2, "0")}-${slugify(title)}`,
        });
      });
    }
  }
  if (looks.length !== 80) {
    throw new Error(`Expected 80 outfit definitions, found ${looks.length}.`);
  }
  if (new Set(looks.map((look) => look.slug)).size !== looks.length) {
    throw new Error("Duplicate outfit slug detected.");
  }
  return looks;
}

function buildPrompt(look) {
  if (IS_MALE) {
    return [
      "Use case: identity-preserve fashion try-on.",
      "Asset type: full-body transparent fashion model cutout for the PrimeStyleAI AI Stylist turntable.",
      "The five supplied images all show the exact same adult man. REFERENCE 1 is the authoritative edit target. Perform a localized wardrobe replacement on that man; do not generate a new person or a lookalike. References 2-5 only confirm the same identity.",
      "Pixel-lock the face and head from Reference 1: do not redraw, reinterpret, beautify, age, reshape, tattoo, or soften any facial feature. The final face, expression, gaze, skin, earrings, chain, hairline, buzz-cut hairstyle, and head angle must match Reference 1 as closely as an image edit.",
      "Preserve his identity exactly: identical facial geometry, eyes, eyebrows, nose, lips, jawline, cheekbones, medium tan skin tone and texture, adult age, dark eye color, short black buzz cut, hairline, lean athletic body shape, height impression, limb proportions, hands, earrings, chain, and calm serious expression. Keep his skin completely tattoo-free.",
      "Preserve the same full-body standing pose and camera: body facing forward, arms relaxed naturally, head angle unchanged, eye contact with camera, straight-on eye-level fashion-catalog camera, full figure centered from hair to shoes.",
      `Change only his clothing, footwear, watch, eyewear, and carried accessory for this ${look.season} ${look.occasion.replace("-", " ")} outfit: ${look.outfit}.`,
      "Make the outfit contemporary, premium, realistic, and season-correct, with controlled modern proportions. Avoid the bad combination of an extremely baggy bottom with a skinny top. Preserve realistic garment construction, fabric texture, seams, folds, weight, and footwear anatomy.",
      "Output one person only on a completely uniform pure-white (#FFFFFF) studio background for later professional background removal. No room, floor line, wall, rectangle, colored aura, glow, gradient, scenery, props, text, logo, watermark, border, or collage. Use clean high-contrast subject edges and no cast shadow.",
      "Do not crop the hair, hands, clothing, bag, or shoes. Do not change the face, hairstyle, body, pose, camera, expression, skin, earrings, or chain. Do not add tattoos, facial hair, extra fingers, limbs, people, or duplicated accessories.",
    ].join(" ");
  }
  return [
    "Use case: identity-preserve fashion try-on.",
    "Asset type: full-body transparent fashion model cutout for the PrimeStyleAI AI Stylist turntable.",
    "The five supplied images all show the exact same adult woman. REFERENCE 1 is the authoritative edit target. Perform a localized wardrobe replacement on that woman; do not generate a new person or a lookalike. References 2-5 only confirm the same identity.",
    "Pixel-lock the face and head from Reference 1: do not redraw, reinterpret, beautify, age, reshape, or soften any facial feature. The final face, expression, gaze, makeup, skin, ears, hairline, hairstyle, and head angle must match Reference 1 as closely as an image edit.",
    "Preserve her identity exactly: identical facial geometry, eyes, eyebrows, nose, lips, jawline, cheekbones, skin tone and texture, adult age, brown eye color, long voluminous dark-brown wavy hair, hairline, body shape, height impression, limb proportions, hands, and warm confident expression.",
    "Preserve the same full-body standing pose and camera: body facing forward, one hand resting naturally at the waist, the opposite arm relaxed, head angle unchanged, eye contact with camera, straight-on eye-level fashion-catalog camera, full figure centered from hair to shoes.",
    `Change only her clothing, shoes, jewelry, and carried accessory for this ${look.season} ${look.occasion.replace("-", " ")} outfit: ${look.outfit}.`,
    "Make the outfit contemporary, premium, realistic, flattering, and season-correct. Preserve realistic garment construction, fabric texture, seams, folds, weight, and footwear anatomy.",
    "Output one person only on a completely uniform pure-white (#FFFFFF) studio background for later professional background removal. No room, floor line, wall, rectangle, colored aura, glow, gradient, scenery, props, text, logo, watermark, border, or collage. Use clean high-contrast subject edges and no cast shadow.",
    "Do not crop the hair, hands, clothing, handbag, or shoes. Do not change the face, hairstyle, body, pose, camera, expression, makeup, or skin. Do not add extra fingers, limbs, people, or duplicated accessories.",
  ].join(" ");
}

async function prepareReferences() {
  mkdirSync(REFERENCE_DIR, { recursive: true });
  const prepared = [];
  for (const [index, relativePath] of ORIGINAL_REFERENCES.entries()) {
    const source = path.join(ROOT, relativePath);
    const destination = path.join(
      REFERENCE_DIR,
      `${GENDER}-identity-reference-v3-white-${String(index + 1).padStart(2, "0")}.webp`,
    );
    if (!existsSync(destination)) {
      const reference = sharp(source);
      if (IS_MALE && index === 1) {
        await reference
          .extract({ left: 330, top: 25, width: 364, height: 430 })
          .resize({ width: 768, height: 1152, fit: "contain", background: "#ffffff" })
          .flatten({ background: "#ffffff" })
          .webp({ quality: 94, alphaQuality: 100 })
          .toFile(destination);
      } else if (IS_MALE && index === 2) {
        await reference
          .extract({ left: 190, top: 0, width: 644, height: 950 })
          .resize({ width: 768, height: 1152, fit: "contain", background: "#ffffff" })
          .flatten({ background: "#ffffff" })
          .webp({ quality: 93, alphaQuality: 100 })
          .toFile(destination);
      } else {
        await reference
          .resize({ width: 768, height: 1152, fit: "contain" })
          .flatten({ background: "#ffffff" })
          .webp({ quality: 92, alphaQuality: 100 })
          .toFile(destination);
      }
    }
    prepared.push(destination);
  }
  return prepared;
}

function requestParts(look, referencePaths) {
  const parts = [{ text: buildPrompt(look) }];
  referencePaths.forEach((referencePath, index) => {
    parts.push({ text: index === 0
      ? `REFERENCE 1 OF 5 — AUTHORITATIVE EDIT TARGET: keep this exact ${IS_MALE ? "man's" : "woman's"} face, head, hair, body, pose, expression, and camera; replace only ${IS_MALE ? "his" : "her"} outfit and accessories.`
      : `IDENTITY CONFIRMATION REFERENCE ${index + 1} OF ${referencePaths.length}: same ${IS_MALE ? "man" : "woman"}; use only to confirm identity.` });
    parts.push({
      inlineData: {
        mimeType: "image/webp",
        data: readFileSync(referencePath).toString("base64"),
      },
    });
  });
  return parts;
}

function requestFor(look, referencePaths) {
  return {
    contents: [{ role: "user", parts: requestParts(look, referencePaths) }],
    metadata: {
      slug: look.slug,
      occasion: look.occasion,
      season: look.season,
      position: String(look.position),
    },
    config: {
      responseModalities: ["IMAGE"],
      temperature: 0.15,
      topP: 0.75,
      imageConfig: { aspectRatio: "2:3", imageSize: "2K" },
    },
  };
}

function extractImage(response) {
  const parts = response.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((part) => part.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    throw new Error("Gemini returned no image.");
  }
  return {
    buffer: Buffer.from(imagePart.inlineData.data, "base64"),
    mimeType: imagePart.inlineData.mimeType || "image/png",
  };
}

async function imageQa(filePath) {
  const image = sharp(filePath).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  let transparent = 0;
  let opaque = 0;
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] <= 16) transparent += 1;
    if (data[index] >= 250) opaque += 1;
  }
  const pixelCount = info.width * info.height;
  return {
    width: info.width,
    height: info.height,
    channels: info.channels,
    transparentPercent: Number(((transparent / pixelCount) * 100).toFixed(2)),
    nearOpaquePercent: Number(((opaque / pixelCount) * 100).toFixed(2)),
  };
}

async function removeBackgroundLocally(sourcePath, destination) {
  const { removeBackground } = backendRequire(
    "@imgly/background-removal-node",
  );
  const source = readFileSync(sourcePath);
  const result = await removeBackground(
    new Blob([new Uint8Array(source)], { type: "image/png" }),
    {
      model: "medium",
      publicPath: BACKGROUND_REMOVAL_PUBLIC_PATH,
      output: { format: "image/png", quality: 1 },
    },
  );
  writeFileSync(destination, Buffer.from(await result.arrayBuffer()));
  return imageQa(destination);
}

async function generateSample(ai, looks, referencePaths) {
  const look = looks[0];
  mkdirSync(SAMPLE_DIR, { recursive: true });
  const rawDestination = path.join(SAMPLE_DIR, `${look.slug}-identity-v3-raw.png`);
  const legacyDestination = path.join(SAMPLE_DIR, `${look.slug}-identity-v3.png`);
  const alphaDestination = path.join(SAMPLE_DIR, `${look.slug}-identity-v3-alpha.png`);
  if (existsSync(alphaDestination)) {
    console.log(JSON.stringify({ kept: path.relative(ROOT, alphaDestination), qa: await imageQa(alphaDestination) }, null, 2));
    return;
  }
  let generated = null;
  if (!existsSync(rawDestination) && !existsSync(legacyDestination)) {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: requestParts(look, referencePaths) }],
      config: {
        responseModalities: ["IMAGE"],
        temperature: 0.15,
        topP: 0.75,
        imageConfig: { aspectRatio: "2:3", imageSize: "2K" },
      },
    });
    generated = extractImage(response);
    await sharp(generated.buffer).png().toFile(rawDestination);
  }
  const sourcePath = existsSync(rawDestination)
    ? rawDestination
    : legacyDestination;
  const alphaQa = await removeBackgroundLocally(sourcePath, alphaDestination);
  const record = {
    generatedAt: new Date().toISOString(),
    model: MODEL,
    look,
    prompt: buildPrompt(look),
    sourceMimeType: generated?.mimeType || "image/png",
    rawPath: path.relative(ROOT, sourcePath),
    outputPath: path.relative(ROOT, alphaDestination),
    rawQa: await imageQa(sourcePath),
    qa: alphaQa,
  };
  writeFileSync(path.join(SAMPLE_DIR, "manifest.json"), `${JSON.stringify(record, null, 2)}\n`);
  console.log(JSON.stringify(record, null, 2));
}

async function createCutouts(looks) {
  mkdirSync(ALPHA_DIR, { recursive: true });
  const candidates = looks.slice(1).filter((look) =>
    existsSync(path.join(RAW_DIR, `${look.slug}.png`)),
  );
  let completed = 0;
  for (const look of candidates) {
    const source = path.join(RAW_DIR, `${look.slug}.png`);
    const destination = path.join(ALPHA_DIR, `${look.slug}.png`);
    if (!existsSync(destination)) {
      await removeBackgroundLocally(source, destination);
    }
    completed += 1;
    console.log(`${completed}/${candidates.length} ${look.slug}`);
  }
  console.log(JSON.stringify({ cutouts: completed, expected: 79 }, null, 2));
}

function finalAlphaPath(look, index) {
  return index === 0
    ? path.join(SAMPLE_DIR, `${look.slug}-identity-v3-alpha.png`)
    : path.join(ALPHA_DIR, `${look.slug}.png`);
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function qaTile(look, sourcePath) {
  const model = await sharp(sourcePath)
    .resize({ width: 300, height: 450, fit: "contain" })
    .png()
    .toBuffer();
  const label = Buffer.from(
    `<svg width="320" height="520" xmlns="http://www.w3.org/2000/svg"><rect width="320" height="520" rx="14" fill="#f8eff6"/><text x="16" y="24" font-family="Arial" font-size="15" font-weight="700" fill="#111">${escapeXml(`${look.position}. ${look.title}`)}</text><text x="16" y="46" font-family="Arial" font-size="11" fill="#6d5f68">${escapeXml(`${look.occasion} · ${look.season}`)}</text></svg>`,
  );
  return sharp(label)
    .composite([{ input: model, left: 10, top: 60 }])
    .jpeg({ quality: 90, chromaSubsampling: "4:4:4" })
    .toBuffer();
}

async function buildQaSheets(looks) {
  const sources = looks.map((look, index) => ({
    look,
    path: finalAlphaPath(look, index),
  }));
  const missing = sources.filter((item) => !existsSync(item.path));
  if (missing.length) {
    throw new Error(`Cannot build QA: ${missing.length} alpha files are missing.`);
  }
  mkdirSync(QA_DIR, { recursive: true });
  const grouped = new Map();
  for (const item of sources) {
    const key = `${item.look.occasion}-${item.look.season.toLowerCase()}`;
    const current = grouped.get(key) || [];
    current.push(item);
    grouped.set(key, current);
  }
  const sheets = [];
  for (const [key, items] of grouped) {
    const tiles = await Promise.all(items.map((item) => qaTile(item.look, item.path)));
    const sheetPath = path.join(QA_DIR, `${key}.jpg`);
    await sharp({
      create: { width: 1600, height: 520, channels: 3, background: "#eee7ec" },
    })
      .composite(tiles.map((input, index) => ({ input, left: index * 320, top: 0 })))
      .jpeg({ quality: 91, chromaSubsampling: "4:4:4" })
      .toFile(sheetPath);
    sheets.push(path.relative(ROOT, sheetPath));
  }
  const alphaQa = [];
  for (const item of sources) {
    const qa = await imageQa(item.path);
    alphaQa.push({ slug: item.look.slug, path: path.relative(ROOT, item.path), ...qa });
  }
  const failures = alphaQa.filter(
    (item) => item.width !== 1696 || item.height !== 2528 || item.transparentPercent < 45,
  );
  const report = {
    generatedAt: new Date().toISOString(),
    sheets,
    alphaQa,
    failures,
  };
  writeFileSync(path.join(QA_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ sheets: sheets.length, alphaFiles: alphaQa.length, failures }, null, 2));
}

async function promoteAssets(looks) {
  const sources = looks.map((look, index) => ({
    look,
    source: finalAlphaPath(look, index),
    destination: path.join(PUBLIC_DIR, `${look.slug}.png`),
  }));
  const missing = sources.filter((item) => !existsSync(item.source));
  if (missing.length) throw new Error(`Cannot promote: ${missing.length} alpha files are missing.`);
  mkdirSync(PUBLIC_DIR, { recursive: true });
  for (const item of sources) copyFileSync(item.source, item.destination);
  const manifest = {
    generatedAt: new Date().toISOString(),
    model: MODEL,
    resolution: "2K",
    count: sources.length,
    looks: sources.map(({ look, destination }) => ({
      ...look,
      image: `${PUBLIC_WEB_DIR}/${path.basename(destination)}`,
    })),
  };
  writeFileSync(path.join(PUBLIC_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  if (IS_MALE) {
    writeMensDataFile(manifest.looks);
  }
  console.log(JSON.stringify({ promoted: sources.length, destination: path.relative(ROOT, PUBLIC_DIR) }, null, 2));
}

function writeMensDataFile(looks) {
  if (!IS_MALE) throw new Error("The men's data module requires --gender=male.");
  const typedLooks = looks.map(
    ({ occasion, season, position, title, outfit, image }) => ({
      occasion,
      season,
      position,
      title,
      outfit,
      image,
    }),
  );
  const source =
    'import type { ShopAIStylistScenarioLook } from "./shopAIStylistScenarioLooks.data";\n\n' +
    `export const SHOP_AI_STYLIST_MENS_SCENARIO_LOOKS = ${JSON.stringify(typedLooks, null, 2)} as const satisfies readonly ShopAIStylistScenarioLook[];\n`;
  writeFileSync(MEN_DATA_PATH, source);
  console.log(JSON.stringify({ dataModule: path.relative(ROOT, MEN_DATA_PATH), count: typedLooks.length }, null, 2));
}

function chunkRequests(items) {
  const chunks = [];
  let current = [];
  let currentBytes = 2;
  for (const item of items) {
    const itemBytes = Buffer.byteLength(JSON.stringify(item.request)) + 1;
    if (itemBytes >= MAX_INLINE_BYTES) {
      throw new Error(`Request ${item.look.slug} exceeds the guarded inline limit.`);
    }
    if (current.length && currentBytes + itemBytes >= MAX_INLINE_BYTES) {
      chunks.push(current);
      current = [];
      currentBytes = 2;
    }
    current.push(item);
    currentBytes += itemBytes;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

async function submitBatches(ai, looks, referencePaths) {
  if (existsSync(JOBS_PATH)) {
    throw new Error("Batch jobs already exist; refusing to submit duplicates.");
  }
  const remainingLooks = looks.slice(1);
  const items = remainingLooks.map((look) => ({
    look,
    request: requestFor(look, referencePaths),
  }));
  const chunks = chunkRequests(items);
  const jobs = [];
  for (const [index, chunk] of chunks.entries()) {
    const batch = await ai.batches.create({
      model: MODEL,
      src: chunk.map((item) => item.request),
      config: {
        displayName: `shop-ai-stylist-${GENDER}-80-${String(index + 1).padStart(2, "0")}`,
      },
    });
    jobs.push({
      chunk: index + 1,
      name: batch.name,
      displayName: batch.displayName,
      state: batch.state,
      model: batch.model || MODEL,
      slugs: chunk.map((item) => item.look.slug),
      submittedAt: new Date().toISOString(),
      estimatedInlineBytes: Buffer.byteLength(JSON.stringify(chunk.map((item) => item.request))),
    });
  }
  const manifest = {
    generatedAt: new Date().toISOString(),
    model: MODEL,
    gender: GENDER,
    resolution: "2K",
    aspectRatio: "2:3",
    totalLooks: looks.length,
    sampleSlug: looks[0].slug,
    batchLooks: remainingLooks.length,
    looks: looks.map((look) => ({ ...look, prompt: buildPrompt(look) })),
  };
  mkdirSync(RUN_DIR, { recursive: true });
  writeFileSync(REQUESTS_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(JOBS_PATH, `${JSON.stringify({ jobs }, null, 2)}\n`);
  console.log(JSON.stringify({ submittedJobs: jobs.length, batchLooks: remainingLooks.length, jobs }, null, 2));
}

async function pollBatches(ai, looks) {
  if (!existsSync(JOBS_PATH)) throw new Error("No batch jobs have been submitted.");
  const jobManifest = JSON.parse(readFileSync(JOBS_PATH, "utf8"));
  const statuses = [];
  for (const job of jobManifest.jobs) {
    const endpoint = new URL(
      `https://generativelanguage.googleapis.com/v1beta/${job.name}`,
    );
    endpoint.searchParams.set("fields", "name,done,error");
    const response = await fetch(endpoint, {
      headers: { "x-goog-api-key": getApiKey() },
    });
    if (!response.ok || !response.body) {
      const errorBody = (await response.text()).slice(0, 2048);
      throw new Error(
        `Gemini status check failed: HTTP ${response.status}: ${errorBody}`,
      );
    }
    const declaredBytes = Number(response.headers.get("content-length") || 0);
    if (declaredBytes > 1024 * 1024) {
      await response.body.cancel();
      throw new Error("Gemini status response exceeded the 1 MB safety limit.");
    }
    const chunks = [];
    let receivedBytes = 0;
    for await (const chunk of Readable.fromWeb(response.body)) {
      receivedBytes += chunk.length;
      if (receivedBytes > 1024 * 1024) {
        throw new Error("Gemini status response exceeded the 1 MB safety limit.");
      }
      chunks.push(chunk);
    }
    const batch = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const status = {
      name: batch.name,
      displayName: job.displayName,
      state: batch.done
        ? batch.error
          ? "JOB_STATE_FAILED"
          : "JOB_STATE_SUCCEEDED"
        : "JOB_STATE_PENDING",
      requestCount: job.slugs.length,
      error: batch.error || null,
    };
    statuses.push(status);
  }
  const result = {
    checkedAt: new Date().toISOString(),
    complete: statuses.every((status) => status.state === "JOB_STATE_SUCCEEDED"),
    jobs: statuses,
    generatedBatchFiles: existsSync(RAW_DIR)
      ? looks.slice(1).filter((look) => existsSync(path.join(RAW_DIR, `${look.slug}.png`))).length
      : 0,
  };
  writeFileSync(STATUS_PATH, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
}

function selectedJob() {
  const argument = process.argv.find((value) => value.startsWith("--job="));
  const jobNumber = Number(argument?.slice("--job=".length));
  if (!Number.isInteger(jobNumber) || jobNumber < 1) {
    throw new Error("Provide a valid --job=N argument.");
  }
  const manifest = JSON.parse(readFileSync(JOBS_PATH, "utf8"));
  const job = manifest.jobs[jobNumber - 1];
  if (!job) throw new Error(`Batch job ${jobNumber} does not exist.`);
  return { job, jobNumber };
}

async function downloadBatchResponse() {
  const { job, jobNumber } = selectedJob();
  mkdirSync(RESPONSE_DIR, { recursive: true });
  const destination = path.join(
    RESPONSE_DIR,
    `job-${String(jobNumber).padStart(2, "0")}.json`,
  );
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${job.name}`,
    { headers: { "x-goog-api-key": getApiKey() } },
  );
  if (!response.ok || !response.body) {
    throw new Error(`Gemini result download failed: HTTP ${response.status}.`);
  }
  await pipeline(
    Readable.fromWeb(response.body),
    createWriteStream(destination),
  );
  console.log(
    JSON.stringify(
      {
        job: jobNumber,
        path: path.relative(ROOT, destination),
        bytes: statSync(destination).size,
      },
      null,
      2,
    ),
  );
}

function writeBase64Chunk(state, value) {
  const combined = state.remainder + value;
  const completeLength = combined.length - (combined.length % 4);
  if (completeLength > 0) {
    writeSync(
      state.fd,
      Buffer.from(combined.slice(0, completeLength), "base64"),
    );
  }
  state.remainder = combined.slice(completeLength);
}

async function extractDownloadedResponse() {
  const { job, jobNumber } = selectedJob();
  const source = path.join(
    RESPONSE_DIR,
    `job-${String(jobNumber).padStart(2, "0")}.json`,
  );
  if (!existsSync(source)) throw new Error(`Downloaded response is missing: ${source}`);
  mkdirSync(RAW_DIR, { recursive: true });
  let searchBuffer = "";
  let capture = null;
  let extracted = 0;
  responseChunks: for await (const chunk of createReadStream(source, { encoding: "utf8" })) {
    let text = searchBuffer + chunk;
    let cursor = 0;
    searchBuffer = "";
    for (;;) {
      if (!capture) {
        const inlineIndex = text.indexOf('"inlineData"', cursor);
        if (inlineIndex < 0) {
          searchBuffer = text.slice(Math.max(cursor, text.length - 128));
          break;
        }
        const dataKeyIndex = text.indexOf('"data"', inlineIndex);
        if (dataKeyIndex < 0) {
          searchBuffer = text.slice(inlineIndex);
          break;
        }
        const colonIndex = text.indexOf(":", dataKeyIndex + '"data"'.length);
        const dataQuoteIndex =
          colonIndex < 0 ? -1 : text.indexOf('"', colonIndex + 1);
        if (dataQuoteIndex < 0) {
          searchBuffer = text.slice(inlineIndex);
          break;
        }
        const slug = job.slugs[extracted];
        if (!slug) throw new Error("Response contains more images than requested.");
        const temporaryPath = path.join(RAW_DIR, `${slug}.image`);
        capture = {
          fd: openSync(temporaryPath, "w"),
          remainder: "",
          slug,
          temporaryPath,
        };
        cursor = dataQuoteIndex + 1;
      }

      const quoteIndex = text.indexOf('"', cursor);
      if (quoteIndex < 0) {
        writeBase64Chunk(capture, text.slice(cursor));
        break;
      }
      writeBase64Chunk(capture, text.slice(cursor, quoteIndex));
      if (capture.remainder) {
        writeSync(capture.fd, Buffer.from(capture.remainder, "base64"));
      }
      closeSync(capture.fd);
      const destination = path.join(RAW_DIR, `${capture.slug}.png`);
      await sharp(capture.temporaryPath).png().toFile(destination);
      unlinkSync(capture.temporaryPath);
      extracted += 1;
      capture = null;
      if (extracted === job.slugs.length) break responseChunks;
      cursor = quoteIndex + 1;
    }
  }
  if (capture) {
    closeSync(capture.fd);
    throw new Error("Downloaded JSON ended inside an image payload.");
  }
  if (extracted !== job.slugs.length) {
    throw new Error(
      `Downloaded job ${jobNumber} contains ${extracted}/${job.slugs.length} images.`,
    );
  }
  console.log(JSON.stringify({ job: jobNumber, extracted }, null, 2));
}

const mode = process.argv[2] || "sample";
const looks = buildLooks();
mkdirSync(RUN_DIR, { recursive: true });
const referencePaths = await prepareReferences();
const ai = new GoogleGenAI({ apiKey: getApiKey() });

if (mode === "sample") {
  assertPaidGenerationUnlocked(mode);
  await generateSample(ai, looks, referencePaths);
} else if (mode === "submit") {
  assertPaidGenerationUnlocked(mode);
  if (!process.argv.includes("--sample-approved")) {
    throw new Error("Refusing paid batch submission without --sample-approved.");
  }
  await submitBatches(ai, looks, referencePaths);
} else if (mode === "poll") {
  await pollBatches(ai, looks);
} else if (mode === "cutouts") {
  assertExternalStorageAvailable();
  await createCutouts(looks);
} else if (mode === "qa") {
  assertExternalStorageAvailable();
  await buildQaSheets(looks);
} else if (mode === "promote") {
  if (!process.argv.includes("--qa-approved")) {
    throw new Error("Refusing promotion without --qa-approved.");
  }
  await promoteAssets(looks);
} else if (mode === "sync-data") {
  writeMensDataFile(
    looks.map(({ occasion, season, position, title, outfit, slug }) => ({
      occasion,
      season,
      position,
      title,
      outfit,
      image: `${PUBLIC_WEB_DIR}/${slug}.png`,
    })),
  );
} else if (mode === "download") {
  assertExternalStorageAvailable();
  await downloadBatchResponse();
} else if (mode === "extract") {
  assertExternalStorageAvailable();
  await extractDownloadedResponse();
} else {
  throw new Error(`Unknown mode: ${mode}`);
}
