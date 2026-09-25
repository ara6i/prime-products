export type ShopScenarioOccasion = "everyday" | "work" | "date-night" | "event";
export type ShopScenarioSeason = "Spring" | "Summer" | "Fall" | "Winter";

export interface ShopAIStylistScenarioLook {
  occasion: ShopScenarioOccasion;
  season: ShopScenarioSeason;
  position: number;
  title: string;
  outfit: string;
  image: string;
}

export const SHOP_AI_STYLIST_SCENARIO_LOOKS = [
  {
    "occasion": "everyday",
    "season": "Spring",
    "position": 1,
    "title": "Sage Weekend",
    "outfit": "soft sage cardigan over an ivory fitted tank, clean straight-leg medium-blue jeans, tan leather loafers, and a small camel shoulder bag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/everyday-spring-01-sage-weekend.png"
  },
  {
    "occasion": "everyday",
    "season": "Spring",
    "position": 2,
    "title": "Blue-Sky Layers",
    "outfit": "powder-blue cropped trench over a crisp white tee, cream tailored ankle trousers, white leather sneakers, and a structured pale-blue mini bag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/everyday-spring-02-blue-sky-layers.png"
  },
  {
    "occasion": "everyday",
    "season": "Spring",
    "position": 3,
    "title": "Coral Garden",
    "outfit": "coral fine-knit polo with an ecru A-line midi skirt, nude ballet flats, and a woven tan handbag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/everyday-spring-03-coral-garden.png"
  },
  {
    "occasion": "everyday",
    "season": "Spring",
    "position": 4,
    "title": "Lilac Utility",
    "outfit": "lilac utility jacket over a champagne satin shell, dark-indigo straight jeans, taupe loafers, and a compact cream crossbody",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/everyday-spring-04-lilac-utility.png"
  },
  {
    "occasion": "everyday",
    "season": "Spring",
    "position": 5,
    "title": "Butter Morning",
    "outfit": "butter-yellow cardigan over a blue-and-white striped shirt, stone straight chinos, clean ivory sneakers, and a soft tan tote",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/everyday-spring-05-butter-morning.png"
  },
  {
    "occasion": "everyday",
    "season": "Summer",
    "position": 1,
    "title": "Turquoise Linen",
    "outfit": "turquoise linen button-up with sleeves softly rolled, tailored white shorts, caramel flat sandals, and a woven mini tote",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/everyday-summer-01-turquoise-linen.png"
  },
  {
    "occasion": "everyday",
    "season": "Summer",
    "position": 2,
    "title": "Coral Ease",
    "outfit": "coral sleeveless linen midi dress with a slim woven belt, natural espadrilles, and a cream basket bag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/everyday-summer-02-coral-ease.png"
  },
  {
    "occasion": "everyday",
    "season": "Summer",
    "position": 3,
    "title": "Cobalt Coast",
    "outfit": "cobalt square-neck tank with sand wide-leg linen trousers, tan slide sandals, and a small white shoulder bag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/everyday-summer-03-cobalt-coast.png"
  },
  {
    "occasion": "everyday",
    "season": "Summer",
    "position": 4,
    "title": "White Poplin Day",
    "outfit": "crisp white cotton poplin midi dress with an emerald mini bag, delicate gold jewelry, and flat tan sandals",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/everyday-summer-04-white-poplin-day.png"
  },
  {
    "occasion": "everyday",
    "season": "Summer",
    "position": 5,
    "title": "Emerald Denim",
    "outfit": "emerald ribbed sleeveless knit top with a light-wash denim midi skirt, white low-profile sneakers, and a coral crossbody",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/everyday-summer-05-emerald-denim.png"
  },
  {
    "occasion": "everyday",
    "season": "Fall",
    "position": 1,
    "title": "Rust & Indigo",
    "outfit": "rust suede cropped jacket over a cream ribbed knit, indigo straight jeans, cognac ankle boots, and a structured tan bag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/everyday-fall-01-rust-indigo.png"
  },
  {
    "occasion": "everyday",
    "season": "Fall",
    "position": 2,
    "title": "Teal Saturday",
    "outfit": "deep-teal cardigan over an ivory blouse, camel tailored trousers, brown penny loafers, and a burgundy shoulder bag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/everyday-fall-02-teal-saturday.png"
  },
  {
    "occasion": "everyday",
    "season": "Fall",
    "position": 3,
    "title": "Berry Knit",
    "outfit": "berry rib-knit midi dress with a slim cognac belt, chocolate ankle boots, and a small camel top-handle bag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/everyday-fall-03-berry-knit.png"
  },
  {
    "occasion": "everyday",
    "season": "Fall",
    "position": 4,
    "title": "Olive City",
    "outfit": "olive utility jacket over an aubergine knit top, clean dark-denim straight jeans, oxblood loafers, and a taupe crossbody",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/everyday-fall-04-olive-city.png"
  },
  {
    "occasion": "everyday",
    "season": "Fall",
    "position": 5,
    "title": "Cobalt Plaid",
    "outfit": "cobalt crew-neck sweater with a camel-and-blue plaid midi skirt, chocolate knee boots, and a burgundy mini bag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/everyday-fall-05-cobalt-plaid.png"
  },
  {
    "occasion": "everyday",
    "season": "Winter",
    "position": 1,
    "title": "Camel Cobalt",
    "outfit": "long camel wool coat over a cobalt turtleneck, dark-indigo straight jeans, chocolate ankle boots, and a structured burgundy bag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/everyday-winter-01-camel-cobalt.png"
  },
  {
    "occasion": "everyday",
    "season": "Winter",
    "position": 2,
    "title": "Ivory Alpine",
    "outfit": "cropped ivory puffer over an emerald merino knit, charcoal straight trousers, cream winter sneakers, and a teal crossbody",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/everyday-winter-02-ivory-alpine.png"
  },
  {
    "occasion": "everyday",
    "season": "Winter",
    "position": 3,
    "title": "Berry Warmth",
    "outfit": "berry wool coat over a cream sweater dress, cognac knee boots, and a camel top-handle bag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/everyday-winter-03-berry-warmth.png"
  },
  {
    "occasion": "everyday",
    "season": "Winter",
    "position": 4,
    "title": "Navy & Coral",
    "outfit": "navy tailored wool coat over a soft-gray knit and matching straight trousers, coral scarf, oxblood loafers, and a structured cream bag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/everyday-winter-04-navy-coral.png"
  },
  {
    "occasion": "everyday",
    "season": "Winter",
    "position": 5,
    "title": "Forest Layers",
    "outfit": "forest-green belted cardigan over a white poplin shirt, chocolate wool trousers, cognac ankle boots, and a warm-tan tote",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/everyday-winter-05-forest-layers.png"
  },
  {
    "occasion": "work",
    "season": "Spring",
    "position": 1,
    "title": "Lilac Authority",
    "outfit": "lilac single-breasted blazer over a white silk blouse, cream tailored straight trousers, nude pointed pumps, and a structured taupe work bag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/work-spring-01-lilac-authority.png"
  },
  {
    "occasion": "work",
    "season": "Spring",
    "position": 2,
    "title": "Sage Direction",
    "outfit": "sage belted midi dress with refined long sleeves, tan leather loafers, pearl earrings, and a structured cream handbag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/work-spring-02-sage-direction.png"
  },
  {
    "occasion": "work",
    "season": "Spring",
    "position": 3,
    "title": "Skyline Suiting",
    "outfit": "sky-blue blazer over an ivory shell, navy straight trousers, pale-gray pointed pumps, and a structured cobalt bag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/work-spring-03-skyline-suiting.png"
  },
  {
    "occasion": "work",
    "season": "Spring",
    "position": 4,
    "title": "Coral Briefing",
    "outfit": "coral silk blouse with a camel A-line midi skirt, tan block heels, and a cream top-handle work bag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/work-spring-04-coral-briefing.png"
  },
  {
    "occasion": "work",
    "season": "Spring",
    "position": 5,
    "title": "Ivory & Green",
    "outfit": "ivory textured cropped jacket over a champagne shell, emerald tailored trousers, tan loafers, and a structured cognac bag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/work-spring-05-ivory-green.png"
  },
  {
    "occasion": "work",
    "season": "Summer",
    "position": 1,
    "title": "Powder-Blue Set",
    "outfit": "powder-blue sleeveless tailored vest with matching straight trousers, cream pointed slingbacks, and a structured white mini briefcase",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/work-summer-01-powder-blue-set.png"
  },
  {
    "occasion": "work",
    "season": "Summer",
    "position": 2,
    "title": "Emerald Office",
    "outfit": "emerald short-sleeve midi shirt dress with a slim tan belt, cognac slingbacks, and a structured cream handbag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/work-summer-02-emerald-office.png"
  },
  {
    "occasion": "work",
    "season": "Summer",
    "position": 3,
    "title": "Coral Linen",
    "outfit": "white linen blazer over a coral silk shell, sand tailored trousers, tan mules, and a soft camel work tote",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/work-summer-03-coral-linen.png"
  },
  {
    "occasion": "work",
    "season": "Summer",
    "position": 4,
    "title": "Cobalt Wrap",
    "outfit": "cobalt short-sleeve wrap midi dress, nude low heels, delicate gold jewelry, and a structured ivory bag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/work-summer-04-cobalt-wrap.png"
  },
  {
    "occasion": "work",
    "season": "Summer",
    "position": 5,
    "title": "Champagne Teal",
    "outfit": "champagne silk blouse with a deep-teal tailored midi skirt, tan pointed pumps, and a structured burgundy handbag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/work-summer-05-champagne-teal.png"
  },
  {
    "occasion": "work",
    "season": "Fall",
    "position": 1,
    "title": "Burgundy Leadership",
    "outfit": "burgundy blazer over an ivory silk blouse, camel straight trousers, oxblood loafers, and a structured cream work bag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/work-fall-01-burgundy-leadership.png"
  },
  {
    "occasion": "work",
    "season": "Fall",
    "position": 2,
    "title": "Teal Focus",
    "outfit": "deep-teal long-sleeve knit midi dress with a chocolate belt, brown ankle boots, and a structured cognac bag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/work-fall-02-teal-focus.png"
  },
  {
    "occasion": "work",
    "season": "Fall",
    "position": 3,
    "title": "Rust Strategy",
    "outfit": "rust tailored blazer over a cream fine-knit turtleneck, navy straight trousers, tan pointed pumps, and a camel work tote",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/work-fall-03-rust-strategy.png"
  },
  {
    "occasion": "work",
    "season": "Fall",
    "position": 4,
    "title": "Plum Portfolio",
    "outfit": "plum silk blouse with an olive tailored midi skirt, oxblood pumps, and a structured taupe handbag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/work-fall-04-plum-portfolio.png"
  },
  {
    "occasion": "work",
    "season": "Fall",
    "position": 5,
    "title": "Cobalt Trench",
    "outfit": "camel trench over a cobalt blouse, stone tailored trousers, chocolate loafers, and a burgundy top-handle bag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/work-fall-05-cobalt-trench.png"
  },
  {
    "occasion": "work",
    "season": "Winter",
    "position": 1,
    "title": "Evergreen Executive",
    "outfit": "deep-green wool blazer and straight trousers over an ivory silk blouse, chocolate pointed pumps, and a structured camel work bag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/work-winter-01-evergreen-executive.png"
  },
  {
    "occasion": "work",
    "season": "Winter",
    "position": 2,
    "title": "Camel & Berry",
    "outfit": "camel wool coat over a berry long-sleeve knit midi dress, cognac knee boots, and a structured cream handbag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/work-winter-02-camel-berry.png"
  },
  {
    "occasion": "work",
    "season": "Winter",
    "position": 3,
    "title": "Cobalt Precision",
    "outfit": "cobalt blazer over a soft-gray turtleneck, cream wool trousers, oxblood loafers, and a structured navy bag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/work-winter-03-cobalt-precision.png"
  },
  {
    "occasion": "work",
    "season": "Winter",
    "position": 4,
    "title": "Burgundy Suit",
    "outfit": "burgundy wool trouser suit over a blush silk blouse, nude pointed pumps, and a structured taupe briefcase",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/work-winter-04-burgundy-suit.png"
  },
  {
    "occasion": "work",
    "season": "Winter",
    "position": 5,
    "title": "Ivory Texture",
    "outfit": "ivory textured jacket over a champagne shell, chocolate tailored trousers, cognac ankle boots, and a structured burgundy work bag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/work-winter-05-ivory-texture.png"
  },
  {
    "occasion": "date-night",
    "season": "Spring",
    "position": 1,
    "title": "Blush Twilight",
    "outfit": "blush satin slip midi dress with a cropped ivory jacket, nude strappy sandals, pearl drop earrings, and a champagne clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/date-night-spring-01-blush-twilight.png"
  },
  {
    "occasion": "date-night",
    "season": "Spring",
    "position": 2,
    "title": "Lavender Hour",
    "outfit": "lavender wrap midi dress with soft draping, silver strappy heels, crystal earrings, and a small silver clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/date-night-spring-02-lavender-hour.png"
  },
  {
    "occasion": "date-night",
    "season": "Spring",
    "position": 3,
    "title": "Emerald Bloom",
    "outfit": "emerald silk blouse with a cream satin midi skirt, gold heeled sandals, and a compact coral clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/date-night-spring-03-emerald-bloom.png"
  },
  {
    "occasion": "date-night",
    "season": "Spring",
    "position": 4,
    "title": "Coral Confidence",
    "outfit": "coral asymmetric tailored jumpsuit with a defined waist, gold sandals, sculptural gold earrings, and a cobalt mini bag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/date-night-spring-04-coral-confidence.png"
  },
  {
    "occasion": "date-night",
    "season": "Spring",
    "position": 5,
    "title": "Cobalt Romance",
    "outfit": "cobalt off-shoulder satin midi dress, silver heels, crystal earrings, and a blush clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/date-night-spring-05-cobalt-romance.png"
  },
  {
    "occasion": "date-night",
    "season": "Summer",
    "position": 1,
    "title": "Ruby Sunset",
    "outfit": "ruby-red satin slip midi dress, gold strappy sandals, delicate gold earrings, and a small champagne clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/date-night-summer-01-ruby-sunset.png"
  },
  {
    "occasion": "date-night",
    "season": "Summer",
    "position": 2,
    "title": "Turquoise Moon",
    "outfit": "turquoise halter-neck midi dress with fluid drape, nude heeled sandals, gold hoops, and a cream mini bag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/date-night-summer-02-turquoise-moon.png"
  },
  {
    "occasion": "date-night",
    "season": "Summer",
    "position": 3,
    "title": "Cobalt Satin",
    "outfit": "white one-shoulder fitted top with a cobalt satin midi skirt, silver sandals, and a coral clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/date-night-summer-03-cobalt-satin.png"
  },
  {
    "occasion": "date-night",
    "season": "Summer",
    "position": 4,
    "title": "Coral Afterglow",
    "outfit": "coral draped one-shoulder mini dress with elegant coverage, nude heels, gold earrings, and a cobalt mini bag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/date-night-summer-04-coral-afterglow.png"
  },
  {
    "occasion": "date-night",
    "season": "Summer",
    "position": 5,
    "title": "Emerald Night",
    "outfit": "emerald asymmetric tailored jumpsuit with a defined waist, gold heels, crystal earrings, and a champagne clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/date-night-summer-05-emerald-night.png"
  },
  {
    "occasion": "date-night",
    "season": "Fall",
    "position": 1,
    "title": "Burgundy Velvet",
    "outfit": "burgundy velvet midi dress with a refined square neckline, gold earrings, oxblood pumps, and a champagne clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/date-night-fall-01-burgundy-velvet.png"
  },
  {
    "occasion": "date-night",
    "season": "Fall",
    "position": 2,
    "title": "Rust Satin",
    "outfit": "rust satin blouse with a dark-teal midi skirt, cognac heels, sculptural gold earrings, and a camel clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/date-night-fall-02-rust-satin.png"
  },
  {
    "occasion": "date-night",
    "season": "Fall",
    "position": 3,
    "title": "Plum Embrace",
    "outfit": "plum off-shoulder long-sleeve knit midi dress, chocolate heeled boots, gold earrings, and a warm-ivory mini bag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/date-night-fall-03-plum-embrace.png"
  },
  {
    "occasion": "date-night",
    "season": "Fall",
    "position": 4,
    "title": "Cobalt Evening",
    "outfit": "cobalt long-sleeve wrap midi dress, gold pointed pumps, delicate gold jewelry, and a burgundy clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/date-night-fall-04-cobalt-evening.png"
  },
  {
    "occasion": "date-night",
    "season": "Fall",
    "position": 5,
    "title": "Oxblood Glow",
    "outfit": "champagne silk blouse with an oxblood leather-look midi skirt, chocolate pumps, crystal earrings, and a compact camel bag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/date-night-fall-05-oxblood-glow.png"
  },
  {
    "occasion": "date-night",
    "season": "Winter",
    "position": 1,
    "title": "Emerald Velvet",
    "outfit": "emerald long-sleeve velvet midi dress, crystal drop earrings, metallic silver pumps, and a silver clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/date-night-winter-01-emerald-velvet.png"
  },
  {
    "occasion": "date-night",
    "season": "Winter",
    "position": 2,
    "title": "Ruby Frost",
    "outfit": "ruby satin midi dress with an ivory faux-fur capelet, gold heels, crystal earrings, and a champagne clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/date-night-winter-02-ruby-frost.png"
  },
  {
    "occasion": "date-night",
    "season": "Winter",
    "position": 3,
    "title": "Cobalt Candlelight",
    "outfit": "cobalt long-sleeve satin wrap midi dress, silver pointed pumps, crystal earrings, and an ivory clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/date-night-winter-03-cobalt-candlelight.png"
  },
  {
    "occasion": "date-night",
    "season": "Winter",
    "position": 4,
    "title": "Burgundy Snow",
    "outfit": "ivory silk long-sleeve top with a burgundy velvet midi skirt, gold pumps, pearl earrings, and a champagne clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/date-night-winter-04-burgundy-snow.png"
  },
  {
    "occasion": "date-night",
    "season": "Winter",
    "position": 5,
    "title": "Plum Tuxedo",
    "outfit": "plum tailored trouser suit over a champagne satin camisole, metallic heels, sculptural gold earrings, and a small ivory bag",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/date-night-winter-05-plum-tuxedo.png"
  },
  {
    "occasion": "event",
    "season": "Spring",
    "position": 1,
    "title": "Lavender Pleats",
    "outfit": "lavender pleated floor-length gown with a defined waist, silver sandals, crystal earrings, and a silver clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/event-spring-01-lavender-pleats.png"
  },
  {
    "occasion": "event",
    "season": "Spring",
    "position": 2,
    "title": "Emerald Ceremony",
    "outfit": "emerald satin midi dress with architectural draping, gold heels, refined gold jewelry, and a champagne clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/event-spring-02-emerald-ceremony.png"
  },
  {
    "occasion": "event",
    "season": "Spring",
    "position": 3,
    "title": "Coral Gala",
    "outfit": "coral draped floor-length gown with an elegant asymmetric neckline, nude heels, gold earrings, and a cobalt clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/event-spring-03-coral-gala.png"
  },
  {
    "occasion": "event",
    "season": "Spring",
    "position": 4,
    "title": "Powder-Blue Arrival",
    "outfit": "powder-blue tailored wide-leg jumpsuit with a defined waist, silver heels, crystal earrings, and an ivory clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/event-spring-04-powder-blue-arrival.png"
  },
  {
    "occasion": "event",
    "season": "Spring",
    "position": 5,
    "title": "Garden Muse",
    "outfit": "ivory-ground floral midi dress with lavender, coral, and green botanical print, nude heels, pearl earrings, and a sage clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/event-spring-05-garden-muse.png"
  },
  {
    "occasion": "event",
    "season": "Summer",
    "position": 1,
    "title": "Cobalt Spotlight",
    "outfit": "cobalt one-shoulder floor-length gown with fluid satin drape, silver sandals, crystal earrings, and a silver clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/event-summer-01-cobalt-spotlight.png"
  },
  {
    "occasion": "event",
    "season": "Summer",
    "position": 2,
    "title": "Coral Horizon",
    "outfit": "coral halter-neck maxi dress with a clean flowing silhouette, gold sandals, gold earrings, and a turquoise clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/event-summer-02-coral-horizon.png"
  },
  {
    "occasion": "event",
    "season": "Summer",
    "position": 3,
    "title": "Emerald Statement",
    "outfit": "emerald silk wide-leg jumpsuit with a sculpted neckline, gold heels, crystal earrings, and a champagne clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/event-summer-03-emerald-statement.png"
  },
  {
    "occasion": "event",
    "season": "Summer",
    "position": 4,
    "title": "Sunlit Pleats",
    "outfit": "marigold-yellow pleated midi dress with a defined waist, nude heels, gold jewelry, and a cobalt clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/event-summer-04-sunlit-pleats.png"
  },
  {
    "occasion": "event",
    "season": "Summer",
    "position": 5,
    "title": "Fuchsia Celebration",
    "outfit": "fuchsia asymmetric floor-length gown with clean draping, silver heels, crystal earrings, and an ivory clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/event-summer-05-fuchsia-celebration.png"
  },
  {
    "occasion": "event",
    "season": "Fall",
    "position": 1,
    "title": "Rust Grandeur",
    "outfit": "rust satin floor-length gown with refined long sleeves and a defined waist, gold heels, gold earrings, and a teal clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/event-fall-01-rust-grandeur.png"
  },
  {
    "occasion": "event",
    "season": "Fall",
    "position": 2,
    "title": "Burgundy Premiere",
    "outfit": "burgundy velvet floor-length gown with an elegant square neckline, metallic heels, crystal earrings, and a champagne clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/event-fall-02-burgundy-premiere.png"
  },
  {
    "occasion": "event",
    "season": "Fall",
    "position": 3,
    "title": "Teal Reception",
    "outfit": "deep-teal one-shoulder midi dress with architectural draping, gold pumps, gold earrings, and a camel clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/event-fall-03-teal-reception.png"
  },
  {
    "occasion": "event",
    "season": "Fall",
    "position": 4,
    "title": "Plum Modernist",
    "outfit": "plum tailored wide-leg jumpsuit with a satin lapel and defined waist, metallic heels, crystal earrings, and an ivory clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/event-fall-04-plum-modernist.png"
  },
  {
    "occasion": "event",
    "season": "Fall",
    "position": 5,
    "title": "Bronze Light",
    "outfit": "warm-bronze long-sleeve satin gown with clean column drape, oxblood heels, gold earrings, and a burgundy clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/event-fall-05-bronze-light.png"
  },
  {
    "occasion": "event",
    "season": "Winter",
    "position": 1,
    "title": "Cobalt Crystal",
    "outfit": "cobalt floor-length gown with subtle crystal shoulder detailing and elegant long sleeves, silver heels, crystal earrings, and a silver clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/event-winter-01-cobalt-crystal.png"
  },
  {
    "occasion": "event",
    "season": "Winter",
    "position": 2,
    "title": "Emerald Velvet Gala",
    "outfit": "emerald velvet floor-length gown with a refined off-shoulder neckline, metallic heels, crystal jewelry, and a champagne clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/event-winter-02-emerald-velvet-gala.png"
  },
  {
    "occasion": "event",
    "season": "Winter",
    "position": 3,
    "title": "Ruby Grand Entrance",
    "outfit": "ruby-red satin floor-length gown with sculptural draping, gold heels, crystal earrings, and an ivory clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/event-winter-03-ruby-grand-entrance.png"
  },
  {
    "occasion": "event",
    "season": "Winter",
    "position": 4,
    "title": "Plum Starlight",
    "outfit": "plum long-sleeve sequin midi dress with a clean fitted silhouette, metallic heels, crystal earrings, and a silver clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/event-winter-04-plum-starlight.png"
  },
  {
    "occasion": "event",
    "season": "Winter",
    "position": 5,
    "title": "Midnight Tuxedo",
    "outfit": "midnight-navy tuxedo-inspired wide-leg jumpsuit with a silver satin lapel, silver heels, crystal earrings, and a cobalt clutch",
    "image": "/media/global-shop/ai-stylist-scenarios-v1/event-winter-05-midnight-tuxedo.png"
  }
] as const satisfies readonly ShopAIStylistScenarioLook[];

