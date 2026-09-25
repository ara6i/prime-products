#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const coveragePath = path.join(reportRoot, "mens-128-scenario-coverage/coverage.json");
const alphaReservationsPath = path.join(
  reportRoot,
  "cj-manual-gemini-final-alpha/scenario-reservations.json",
);
const planningVisualQaPath = path.join(
  reportRoot,
  "planning-reservation-gallery/one-by-one-visual-qa.json",
);
const outputDir = path.join(reportRoot, "next-cj-exact-page-queue");
const outputJsonPath = path.join(outputDir, "queue.json");
const outputMarkdownPath = path.join(outputDir, "QUEUE.md");
const manifestDir = path.join(repoRoot, "scripts/ai-stylist/manifests");
const searchDecisionsPath = path.join(
  repoRoot,
  "scripts/ai-stylist/cj-exact-page-search-decisions.json",
);

const [coverage, alphaReservations, planningVisualQa, searchDecisions] = await Promise.all([
  readFile(coveragePath, "utf8").then(JSON.parse),
  readFile(alphaReservationsPath, "utf8").then(JSON.parse),
  readFile(planningVisualQaPath, "utf8").then(JSON.parse),
  readFile(searchDecisionsPath, "utf8").then(JSON.parse),
]);
const scenarioById = new Map(
  coverage.scenarios.map((scenario) => [scenario.scenarioId, scenario]),
);
const planningQaByProductId = new Map(
  planningVisualQa.decisions.map((entry) => [String(entry.productId), entry]),
);
const searchDecisionByQueueId = new Map(
  searchDecisions.decisions.map((entry) => [entry.queueId, entry]),
);
const planningByScenario = new Map();
for (const entry of alphaReservations.reservations) {
  if (entry.reservationStatus !== "reserved-not-outfit-approved") continue;
  if (planningQaByProductId.get(String(entry.productId))?.decision !== "pass") continue;
  if (!planningByScenario.has(entry.scenarioId)) {
    planningByScenario.set(entry.scenarioId, entry);
  }
}

const fixedRoleTuples = [
  // Five unique shoes that immediately complete five already coherent visual cores.
  ["shoe", "S197", "men dark chocolate suede side zip ankle boots round toe slim sole", "dark-chocolate suede side-zip ankle boot", "Use only after S197 gains a true controlled-straight light-gray trouser; the former narrow stacked trouser was rejected."],
  ["shoe", "S217", "men light gray training shoes low profile", "light-gray streamlined trainer", "Open Spring Sports with a true training shoe and no heavy trail sole."],
  ["shoe", "S221", "men light warm gray breathable trainers gum sole low profile", "light warm-gray breathable trainer", "Complete the light-blue and mint Summer Sports core with a distinct breathable trainer and restrained gum detail."],
  ["shoe", "S249", "men cream suede espadrilles rope sole low profile", "cream suede rope-sole espadrille", "Complete the sunny-yellow and stone-beige Spring Resort core with a distinct light textured shoe."],
  ["shoe", "S253", "men woven leather espadrilles tobacco", "tobacco woven leather espadrille", "Complete the white linen Resort shirt with a genuinely warm-weather shoe."],

  // S157 lost its former wide-leg bottom after the combined-board re-audit; both pieces are now required.
  ["bottom", "S157", "men warm khaki pleated trousers controlled straight leg regular fit", "warm-khaki controlled-straight pleated trouser", "Replace the rejected wide-leg trouser with a genuinely controlled, non-skinny and non-baggy Fall Office bottom."],
  ["shoe", "S157", "men burgundy suede penny loafer almond toe", "burgundy suede penny loafer", "Use only after S157 gains a visually approved controlled-straight bottom; do not treat the shoe alone as an outfit unlock."],

  // S205 also lost its former wide bottom after the full-resolution re-audit.
  ["bottom", "S205", "men french blue pleated trousers controlled straight leg lightweight", "French-blue lightweight controlled-straight trouser", "Preserve the happy blue Summer Party direction while replacing the rejected loose wide-leg bottom with controlled tailoring."],
  ["shoe", "S205", "men sand suede loafers round toe slim sole", "sand suede loafer", "Use only after S205 gains a visually approved controlled-straight French-blue bottom; do not treat the shoe alone as an outfit unlock."],

  // S189 lost its complete Summer Date look when the flat-only white trouser failed the source-proof gate.
  ["bottom", "S189", "men ecru lightweight pleated trousers controlled straight leg summer regular fit", "ecru lightweight controlled-straight Summer trouser", "Replace the rejected flat-only white trouser with a full-length worn source that proves rise, thigh ease, knee width, clean hem and controlled straight proportion beside the accepted sunset-orange top. The former two-tone loafer is revoked and a separate unique modern shoe is queued."],

  // Nine additional shoes supporting existing holds or final-alpha planning reservations.
  ["shoe", "S141", "men light stone suede court sneakers low sole", "light stone suede court sneaker", "Complete the warm-brown polo reservation with a light, non-bulky Fall Casual shoe."],
  ["shoe", "S237", "men ecru leather court sneakers low sole", "ecru low-profile court sneaker", "Complete the raw-jute linen travel layer with quiet light footwear."],
  ["shoe", "S133", "men cream leather sneakers gum sole low profile", "cream gum-sole sneaker", "Complete the visually screened cream, French-blue and washed-blue Spring Casual garment core."],
  ["shoe", "S185", "men cream leather sneakers low sole round toe", "cream rounded court sneaker", "Complete the warm-khaki Spring Date trouser reservation."],
  ["shoe", "S173", "men dark brown leather loafer almond toe slim sole", "dark-brown leather loafer", "Match the dark-coffee belt in a Fall Formal look without defaulting to black."],
  ["shoe", "S233", "men off white leather sneakers low profile", "off-white low-profile sneaker", "Complete the light-khaki cap Spring Travel reservation."],
  ["shoe", "S153", "men tobacco suede penny loafer almond toe", "tobacco suede penny loafer", "Complete the hemp-apricot knit polo Summer Office reservation."],
  ["shoe", "S209", "men light stone suede sneakers low profile", "light-stone suede sneaker", "Complete the wine-red corduroy Fall Party jacket reservation."],
  ["shoe", "S241", "men tobacco suede court sneakers low sole", "tobacco suede court sneaker", "Complete the rust-brown Fall Travel field-jacket reservation."],
  // Five distinct Summer Casual shoes needed to finish S137 without recycling its current five pairs.
  ["shoe", "S137", "men ecru canvas deck sneakers low sole", "ecru canvas deck sneaker", "S137 look 6: clean canvas alternative; no white leather duplicate."],
  ["shoe", "S137", "men olive suede canvas espadrilles", "olive suede-canvas espadrille", "S137 look 7: muted green woven summer texture."],
  ["shoe", "S137", "men cognac leather slides wide strap minimalist", "cognac minimalist leather slide", "S137 look 8: one refined open summer shoe; reject orthopedic straps."],
  ["shoe", "S137", "men sage canvas low top sneakers gum sole", "sage canvas gum-sole sneaker", "S137 look 9: happy muted color without a bulky running sole."],
  ["shoe", "S137", "men muted blue low profile running shoes", "muted-blue low-profile trainer", "S137 look 10: streamlined sporty option, not a dad sneaker."],
  // Seven shoes open additional winter, office, formal, party, resort, travel and active cells.
  ["shoe", "S145", "men tobacco suede chukka boots round toe slim sole", "tobacco rounded chukka", "Open Winter Casual with a clean, non-pointed ankle shoe."],
  ["shoe", "S149", "men oxblood leather derby round toe slim sole", "oxblood round-toe derby", "Add one warm Spring Office alternative to the black penny loafer already used."],
  ["shoe", "S229", "men cream gray weather resistant training shoes low profile gum sole", "cream-gray weather-resistant trainer", "Complete the bean-green and deep-blue Winter Sports core with a light weather-capable trainer distinct from every other active shoe role."],
  ["shoe", "S161", "men burgundy suede derby shoes round toe slim rubber sole", "burgundy suede round-toe derby", "Bring controlled rich color to the held deep-brown trouser, planned soft-blue knit and camel coat; do not substitute another brown shoe."],
  ["shoe", "S245", "men taupe suede waterproof sneaker boots low profile", "taupe weather-resistant sneaker boot", "Complete the dusty-blue and pale-stone Winter Travel core with a practical refined shoe distinct from the active trainers and formal boots."],
  ["shoe", "S201", "men dark olive suede loafers round toe slim sole", "dark-olive suede round-toe loafer", "Complete the dusty-rose Spring Party direction with a rich colored shoe that avoids black and remains distinct from every other queued loafer."],
  ["shoe", "S165", "men burgundy leather double monk strap shoes round toe slim sole", "burgundy leather round-toe double-monk shoe", "Complete the lilac and dark-taupe Spring Formal direction with a distinctive warm shoe rather than black."],

  // Six suit identities establish the currently empty suit banks.
  ["suit", "S149", "men regular fit unstructured two piece suit light gray straight trousers", "light-gray unstructured suit", "Spring Office suit bank; full-length jacket and trouser proof required."],
  ["suit", "S153", "men linen blend suit regular fit sand straight trousers", "sand linen-blend suit", "Summer Office suit bank; breathable and not wedding-styled."],
  ["suit", "S157", "men wool blend suit regular fit tobacco straight trousers", "tobacco wool-blend suit", "Fall Office suit bank with warm color and controlled tailoring."],
  ["suit", "S165", "men regular fit unstructured suit muted blue straight trousers", "muted-blue unstructured suit", "Spring Formal bank; reject shiny or cropped wedding construction."],
  ["suit", "S173", "men regular fit suit soft olive straight trousers", "soft-olive regular suit", "Fall Formal companion for the reserved coffee belt and brown loafer."],
  ["suit", "S201", "men relaxed fit single breasted suit burgundy straight trousers", "muted-burgundy party suit", "Spring Party suit bank; rich color without satin or skinny trousers."],

  // Five exact companions for already reserved tops and layers.
  ["bottom", "S141", "men ecru straight leg denim regular fit", "ecru straight denim", "Bottom for the warm-brown polo and light-stone sneaker."],
  ["bottom", "S237", "men olive tailored travel trousers straight leg lightweight", "olive lightweight travel trouser", "Full-resolution local review rejected the ribbed Resort pant, pale technical trouser, tapered jogger, two cargo shapes, hiking trouser and pooled flax drawstring pant; require a clean lightweight olive Travel trouser without elastic-cuff, cargo or lounge styling."],
  ["bottom", "S153", "men muted blue pleated trousers straight leg regular fit", "muted-blue pleated trouser", "Local visual comparison failed all three existing bottoms; source credible Summer Office tailoring for the hemp-apricot knit polo."],
  ["bottom", "S201", "men ecru pleated trousers straight leg regular fit", "ecru pleated straight trouser", "Every reusable Spring Party bottom failed visual review; use only after a replacement dusty-rose top with full worn-body proof also passes."],
  ["bottom", "S197", "men winter light gray wool blend trousers controlled straight leg regular fit", "light-gray wool-blend controlled-straight winter trouser", "The former gray trouser proved narrow through the thigh and lower leg and stacked at both shoes; source a true straight Winter Date bottom."],
  ["bottom", "S253", "men tobacco terracotta tailored resort shorts above knee clean waistband regular fit", "tobacco or terracotta tailored above-knee Resort short", "Replace the sporty drawstring short that failed beside the refined white linen shirt; require a clean waistband and polished Resort finish."],

  // Three tops complete planned bottom/accessory-led looks.
  ["top", "S185", "men dusty rose knit polo regular fit", "dusty-rose fine-knit polo", "Top for the warm-khaki Date trouser and cream sneaker."],
  ["top", "S173", "men warm white fine knit polo regular fit", "warm-white fine-knit polo", "Base under the soft-olive Fall Formal suit."],
  ["top", "S161", "men soft sky blue merino fine knit long sleeve polo regular fit", "soft sky-blue fine-knit long-sleeve polo", "Keep the held deep-brown trouser and planned camel coat light and modern; require a controlled regular body with full worn proof."],
  ["top", "S245", "men plum merino crew neck sweater regular fit", "plum fine-knit crew-neck sweater", "Existing Winter Travel tops were too bulky, dark or seasonally weak; add a clean warm color layer beneath the held dusty-blue puffer."],
  ["top", "S165", "men soft lilac fine knit long sleeve polo regular fit", "soft-lilac fine-knit long-sleeve polo", "Existing Spring Formal shirts were casual overshirts, checks or washed-out linen; add a controlled refined color top for the planned straight pleated trouser."],
  ["top", "S149", "men dusty coral fine knit long sleeve polo regular fit", "dusty-coral fine-knit long-sleeve polo", "The existing pink option was an oversized open overshirt; source a self-contained happy-color Spring Office top for the held gray trouser and planned oxblood derby."],
  ["top", "S201", "men dusty rose cotton shirt regular fit full body spring party", "dusty-rose regular-fit cotton shirt with full worn-body proof", "The former cropped source never proved the shirt hem or full torso; require a complete worn view and controlled regular proportion."],
  ["top", "S209", "men warm ivory fine rib knit polo mock neck regular fit fall party", "warm-ivory fine-rib regular-fit party knit", "Replace the rejected dropped long white mock-neck with a compact regular top that layers cleanly under the reserved wine-red blouson."],
  ["top", "S241", "men sky blue cotton travel shirt regular fit long sleeve no roll tabs", "sky-blue regular-fit travel shirt without roll tabs", "Replace the rejected long shiny roll-tab shirt with a clean regular body that layers beneath the reserved rust field jacket."],

  // Three corrected bottoms exposed by the consolidated and full-resolution provisional review.
  ["bottom", "S165", "men dark taupe brown high rise double pleat trousers controlled straight leg formal", "dark-taupe brown high-rise double-pleat straight trouser", "The earlier trouser was narrow through the thigh and lower leg with a cropped ankle line; source true controlled-straight Formal tailoring."],
  ["bottom", "S241", "men warm stone lightweight single pleat travel trousers straight leg regular fit", "warm-stone lightweight single-pleat travel trouser", "The earlier ecru jean was very wide and puddled over the shoes; source a controlled travel trouser for the held light-blue shirt, rust field jacket and tobacco sneaker."],

  // Two seasonal layers, one bag and two watches cover remaining selectable garment types.
  ["outerwear", "S161", "men camel wool car coat regular fit", "camel wool car coat", "Open Winter Office with a light warm coat rather than dark navy or black."],
  ["outerwear", "S229", "men cream technical puffer jacket short regular fit", "cream short technical puffer", "Open Winter Sports with a clean light performance layer."],
  ["outerwear", "S145", "men camel sherpa collar short blouson regular fit winter", "camel sherpa-collar short regular blouson", "The existing product cutout lacked the worn shoulder, body, sleeve and hem proof required for Winter Casual approval."],
  ["bag", "S233", "men canvas leather backpack minimalist olive tan", "olive-and-tan minimalist backpack", "Practical Spring Travel bag; no black business backpack duplicate."],
  ["bag", "S245", "men camel canvas leather weekender bag minimalist", "camel canvas-and-leather weekender", "Add a warm practical Winter Travel bag without repeating the black business backpacks already seen."],
  ["watch", "S173", "men minimal watch cream dial brown leather thin case", "cream-dial brown-leather watch", "Fall Formal watch coordinated with coffee belt and dark-brown loafer."],
  ["watch", "S165", "men minimal watch pale blue dial brown leather thin silver case", "pale-blue-dial brown-leather watch", "Complete Spring Formal with a light colored dial, restrained case and no fake-luxury branding."],
];

// Append newly exposed roles after every fixed and manifest role so existing CJQ IDs remain stable.
const supplementalRoleTuples = [
  [
    "top",
    "S157",
    "men sky blue fine knit polo sweater long sleeve regular fit",
    "soft sky-blue fine-knit long-sleeve polo",
    "Replace the revoked dropped-shoulder gray lounge knit with a clean Fall Office top: natural shoulder, controlled regular body, upper-hip hem and no long layered tee.",
  ],
  [
    "bottom",
    "S209",
    "men camel khaki pleated trousers controlled straight leg regular fit fall party",
    "camel-khaki controlled-straight pleated trouser",
    "Replace the globally revoked wide-leg khaki trouser with a true controlled straight Fall Party bottom for the wine-red blouson; no broad drape, puddling or cropped skinny taper.",
  ],
  // Five retained top-bottom-shoe cores need three unique add-ons each before they are UI-complete.
  [
    "outerwear",
    "S137",
    "men pale apricot cotton linen overshirt lightweight regular fit summer",
    "pale-apricot lightweight cotton-linen overshirt",
    "Complete S137 Soft White and Fresh Green core 1 with a light happy-color layer; natural shoulder, clean upper-hip hem and no oversized drop.",
  ],
  [
    "bag",
    "S137",
    "men ecru canvas crossbody bag minimalist sage trim",
    "ecru canvas crossbody with restrained sage trim",
    "Complete S137 core 1 with a compact warm-weather bag that supports the fresh-green short without repeating a black backpack.",
  ],
  [
    "accessory",
    "S137",
    "men washed blue cotton cap minimalist curved brim no logo",
    "washed-blue minimalist cotton cap",
    "Complete S137 core 1 with one soft-color summer accent; reject logos, patches and oversized streetwear shapes.",
  ],
  [
    "outerwear",
    "S137",
    "men dusty sky blue linen overshirt lightweight regular fit summer",
    "dusty-sky-blue lightweight linen overshirt",
    "Complete S137 Sage, Warm Ivory and Tan Suede core 2 with a distinct airy blue layer; no boxy cargo volume or long dropped hem.",
  ],
  [
    "bag",
    "S137",
    "men cognac woven leather crossbody bag compact minimalist",
    "compact cognac woven-leather crossbody",
    "Complete S137 core 2 with a polished warm bag that relates to the tan suede loafer without copying its supplier identity.",
  ],
  [
    "accessory",
    "S137",
    "men tortoiseshell rectangular sunglasses minimalist",
    "minimal tortoiseshell rectangular sunglasses",
    "Complete S137 core 2 with a clean Summer Casual accessory; reject loud logos, mirrored sport lenses and fake-luxury hardware.",
  ],
  [
    "outerwear",
    "S149",
    "men light gray unstructured blazer regular fit spring office",
    "light-gray unstructured regular-fit blazer",
    "Complete the S149 sky-blue and khaki Office core with soft modern tailoring; no shiny wedding cloth, tight waist or cropped jacket.",
  ],
  [
    "bag",
    "S149",
    "men dark espresso leather tote briefcase minimalist office",
    "dark-espresso minimalist leather tote briefcase",
    "Complete S149 with one structured but modern Office bag; reject bulky black laptop backpacks and fake-luxury marks.",
  ],
  [
    "accessory",
    "S149",
    "men black leather belt matte silver buckle minimalist",
    "minimal black leather belt with matte-silver buckle",
    "Complete S149 by matching the black loafer cleanly; require a plain buckle and no imitation-designer hardware.",
  ],
  [
    "outerwear",
    "S193",
    "men light stone brushed overshirt jacket short regular fit fall",
    "light-stone short brushed overshirt jacket",
    "Complete the S193 mineral-teal Fall Date core with a soft light layer; no oversized shacket, dropped shoulder or utility bulk.",
  ],
  [
    "bag",
    "S193",
    "men tobacco suede mini messenger bag minimalist",
    "compact tobacco-suede messenger bag",
    "Complete S193 with a small warm-texture Date bag related to the taupe boot; no business briefcase or oversized satchel.",
  ],
  [
    "accessory",
    "S193",
    "men burgundy merino scarf lightweight solid color",
    "lightweight solid-burgundy merino scarf",
    "Complete S193 with one rich happy-color Fall accent; avoid bulky blanket scarves and synthetic shine.",
  ],
  [
    "outerwear",
    "S225",
    "men light gray lightweight technical shell jacket regular fit fall training",
    "light-gray lightweight regular-fit technical shell",
    "Complete the S225 cerulean and camel Fall Sports core with a practical light shell; no oversized puffer or black tactical bulk.",
  ],
  [
    "bag",
    "S225",
    "men olive tan technical backpack minimalist no logo",
    "olive-and-tan minimalist technical backpack",
    "Complete S225 with a compact functional Sports bag that stays warm and light instead of repeating a black business backpack.",
  ],
  [
    "accessory",
    "S225",
    "men burnt orange technical cap minimalist no logo",
    "burnt-orange minimalist technical cap",
    "Complete S225 with a controlled energetic accent that works with cerulean and camel; reject branding and teamwear graphics.",
  ],
  // S213's garment core also needs explicit unique finishing roles. Keep these
  // supplemental so every existing CJQ identity remains stable.
  [
    "bag",
    "S213",
    "men soft taupe suede crossbody bag compact minimalist party",
    "compact soft-taupe suede crossbody bag",
    "Complete the S213 vivid-red and warm-beige Winter Party direction with a quiet compact bag; reject black business bags, oversized satchels, imitation-designer hardware and repeat identities.",
  ],
  [
    "accessory",
    "S213",
    "men camel cream checked wool scarf winter soft",
    "warm camel-and-cream windowpane wool scarf",
    "Complete S213 with a soft Winter accessory that balances the vivid-red knit, warm-ecru corduroy and tobacco loafer without forcing the glossy, oversized or imitation-leather belts exposed by the exact-page review.",
  ],
  [
    "shoe",
    "S189",
    "men ecru light tobacco suede low top sneaker slim gum sole",
    "ecru or light-tobacco low-profile suede sneaker with slim gum sole",
    "Complete S189's sunset-orange shirt and beige-apricot controlled-straight Summer Date core with a unique modern low-profile suede sneaker; reject formal loafers, bulky trainers, optic-white platforms and repeated identities.",
  ],
  [
    "bag",
    "S253",
    "men olive canvas tote bag leather trim minimalist",
    "olive canvas soft tote with restrained tonal leather trim",
    "Complete a Summer Resort Budget-Friendly candidate built from the reserved white linen shirt, controlled taupe tailored short, washed-sky linen layer, tobacco-and-cream loafer and black rectangular sunglasses. Reject military utility bags, black business backpacks, large logos, rigid briefcases and dark bulky construction.",
  ],
];

const fixedRoleKeys = new Set(
  [...fixedRoleTuples, ...supplementalRoleTuples].map(([category, scenarioId, searchPhrase]) =>
    [category, scenarioId, searchPhrase].join("\u0000"),
  ),
);
const manifestFiles = (await readdir(manifestDir))
  .filter((filename) => filename.endsWith("-core.json"))
  .sort();
const manifestRoleTuples = [];
for (const filename of manifestFiles) {
  const manifest = JSON.parse(await readFile(path.join(manifestDir, filename), "utf8"));
  for (const role of manifest.queuedRoles ?? []) {
    const key = [role.category, manifest.scenarioId, role.searchPhrase].join("\u0000");
    if (fixedRoleKeys.has(key)) continue;
    fixedRoleKeys.add(key);
    manifestRoleTuples.push([
      role.category,
      manifest.scenarioId,
      role.searchPhrase,
      role.targetProduct,
      `Exact source gap recorded after full-resolution ${manifest.scenarioId} visual screening.`,
    ]);
  }
}

const roles = [...fixedRoleTuples, ...manifestRoleTuples, ...supplementalRoleTuples].map(
  ([category, scenarioId, searchPhrase, targetProduct, reason], index) => {
    const queueId = `CJQ-${String(index + 1).padStart(3, "0")}`;
    const searchDecision = searchDecisionByQueueId.get(queueId);
    const family = category === "suit" || category === "watch" ? "suit" : "separates";
    return {
      queueId,
      priority: index + 1,
      family,
      category,
      scenarioId,
      searchPhrase,
      targetProduct,
      reason,
      dependencyProductId: planningByScenario.get(scenarioId)?.productId ?? null,
      status: searchDecision?.status ?? "awaiting-manual-cj-exact-page-review",
      candidateProductId: searchDecision?.candidateProductId ?? null,
      cjPageUrl: searchDecision?.cjPageUrl ?? null,
      sourceDecision: searchDecision?.sourceDecision ?? null,
      lastReviewedAt: searchDecision?.lastReviewedAt ?? null,
      searchAttempts: searchDecision?.searchAttempts ?? [],
    };
  },
);

if (roles.length < 56) throw new Error(`Expected at least 56 queue roles, found ${roles.length}`);
if (roles.filter((role) => role.category === "shoe").length < 28) {
  throw new Error("The next queue must contain at least 28 shoe roles");
}
for (const role of roles) {
  const scenario = scenarioById.get(role.scenarioId);
  if (!scenario) throw new Error(`Unknown scenario in CJ queue: ${role.scenarioId}`);
  if (/wedding/i.test(scenario.occasionLabel)) {
    throw new Error(`Wedding scenario entered CJ queue: ${role.scenarioId}`);
  }
  if (scenario.budget !== "budget-friendly") {
    throw new Error(`Unproven price tier entered CJ queue: ${role.scenarioId}`);
  }
  if (role.dependencyProductId) {
    const dependencyQa = planningQaByProductId.get(String(role.dependencyProductId));
    if (dependencyQa?.decision !== "pass") {
      throw new Error(
        `CJ queue dependency lacks planning visual QA pass: ${role.dependencyProductId}`,
      );
    }
  }
}

const categoryCounts = Object.fromEntries(
  [...new Set(roles.map((role) => role.category))]
    .sort()
    .map((category) => [category, roles.filter((role) => role.category === category).length]),
);
const familyCounts = Object.fromEntries(
  [...new Set(roles.map((role) => role.family))]
    .sort()
    .map((family) => [family, roles.filter((role) => role.family === family).length]),
);
const resolvedExistingRoles = roles.filter(
  (role) => role.status === "resolved-by-existing-approved-inventory",
);
const openRoles = roles.filter(
  (role) => role.status !== "resolved-by-existing-approved-inventory",
);
const openCategoryCounts = Object.fromEntries(
  [...new Set(roles.map((role) => role.category))]
    .sort()
    .map((category) => [
      category,
      openRoles.filter((role) => role.category === category).length,
    ]),
);
const reviewedRoles = roles.filter((role) => role.searchAttempts.length > 0);
const reviewedAttempts = reviewedRoles.flatMap((role) => role.searchAttempts);
const rejectedCandidateIdentities = new Set(
  reviewedAttempts
    .filter((attempt) => attempt.productId && attempt.decision.startsWith("reject-"))
    .map((attempt) => attempt.productId),
);
const duplicateCandidateIdentities = new Set(
  reviewedAttempts
    .filter((attempt) => attempt.productId && attempt.decision === "reject-global-duplicate")
    .map((attempt) => attempt.productId),
);
const result = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  status: "awaiting-manual-cj-exact-page-review",
  searchPolicy:
    "Use the exact phrase manually in the logged-in CJ browser. Search cards are discovery only. Open and visually inspect each exact CJ product page; never use the CJ search API.",
  acceptancePolicy: [
    "Reject repeated supplier product IDs even when the color, size, SKU or image differs.",
    "Reject skinny, puddled, balloon, platform, pointed, shiny, logo-heavy, mixed-gallery and weak-fit-proof products.",
    "Approve only product-detail imagery that clearly proves construction and the requested modern Zara-led silhouette.",
    "Do not submit Gemini refinement until exact-page visual, material, variant, inventory and shipping gates pass.",
  ],
  summary: {
    queueRoles: roles.length,
    openQueueRoles: openRoles.length,
    resolvedByExistingInventory: resolvedExistingRoles.length,
    categoryCounts,
    familyCounts,
    openCategoryCounts,
    rolesSupportingExistingFinalAlpha: roles.filter((role) => role.dependencyProductId).length,
    existingFinalAlphaDependencies: new Set(
      roles.map((role) => role.dependencyProductId).filter(Boolean),
    ).size,
    WeddingAndWeddingGuestIncluded: false,
    candidateProductsSelected: roles.filter(
      (role) =>
        role.candidateProductId &&
        role.status !== "resolved-by-existing-approved-inventory",
    ).length,
    manuallyReviewedQueueRoles: reviewedRoles.length,
    manualSearchAttempts: reviewedAttempts.length,
    rejectedCandidateIdentities: rejectedCandidateIdentities.size,
    duplicateCandidateIdentities: duplicateCandidateIdentities.size,
    uiIntegrated: false,
  },
  roles,
};

const rows = roles.map(
  (role) =>
    `| ${role.priority} | ${role.queueId} | ${role.family} | ${role.category} | ${role.scenarioId} | \`${role.searchPhrase}\` | ${role.targetProduct} | ${role.dependencyProductId ?? "-"} | ${role.status}${role.searchAttempts.length ? ` (${role.searchAttempts.length} attempts)` : ""} |`,
);
const reviewRows = reviewedRoles.flatMap((role) =>
  role.searchAttempts.map(
    (attempt) =>
      `| ${role.queueId} | \`${attempt.searchPhrase}\` | ${attempt.productId ?? "-"} | ${attempt.decision} | ${attempt.reason.replaceAll("|", "/")} |`,
  ),
);
const markdown = `# Next manual CJ exact-page sourcing queue

Generated: ${result.generatedAt}

This queue is local planning only. It contains ${result.summary.candidateProductsSelected} source-selected candidate${result.summary.candidateProductsSelected === 1 ? "" : "s"}. A source selection is not an import, refined asset, reserved identity, approved outfit, or UI-integration claim.

- Queue roles: ${result.summary.queueRoles}
- Open queue roles: ${result.summary.openQueueRoles}
- Resolved with existing approved inventory: ${result.summary.resolvedByExistingInventory}
- Shoes: ${categoryCounts.shoe}
- Suits: ${categoryCounts.suit}
- Bottoms: ${categoryCounts.bottom}
- Tops: ${categoryCounts.top}
- Outerwear: ${categoryCounts.outerwear}
- Bags: ${categoryCounts.bag}
- Watches: ${categoryCounts.watch}
- Accessories: ${categoryCounts.accessory ?? 0}
- Separates-family roles: ${familyCounts.separates ?? 0}
- Suit-family roles: ${familyCounts.suit ?? 0}
- Open by category: ${Object.entries(openCategoryCounts)
  .map(([category, count]) => `${category} ${count}`)
  .join(", ")}
- Queue roles supporting an existing final-alpha reservation: ${result.summary.rolesSupportingExistingFinalAlpha}
- Distinct existing final-alpha reservations supported: ${result.summary.existingFinalAlphaDependencies}
- Wedding / Wedding Guest roles: 0
- Selected candidates: ${result.summary.candidateProductsSelected}
- Manually reviewed queue roles: ${result.summary.manuallyReviewedQueueRoles}
- Manual search attempts recorded: ${result.summary.manualSearchAttempts}
- Rejected candidate identities: ${result.summary.rejectedCandidateIdentities}
- Duplicate candidate identities blocked by global uniqueness: ${result.summary.duplicateCandidateIdentities}

## Manual rule

Type each phrase into the logged-in CJ page by hand. A search card is never approval. Open the exact product page, check every gallery image at full size, verify the exact variant, material, price, inventory and shipping, then record the product ID. Do not use the CJ search API.

| Priority | Queue ID | Family | Category | Scenario | Exact search phrase | Required role | Existing dependency | State |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
${rows.join("\n")}

## Recorded manual search attempts

| Queue ID | Search phrase | Product ID | Decision | Visual / identity reason |
| --- | --- | --- | --- | --- |
${reviewRows.join("\n")}
`;

await mkdir(outputDir, { recursive: true });
await Promise.all([
  writeFile(outputJsonPath, `${JSON.stringify(result, null, 2)}\n`),
  writeFile(outputMarkdownPath, markdown),
]);
console.log(JSON.stringify({ outputJsonPath, outputMarkdownPath, ...result.summary }, null, 2));
