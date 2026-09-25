"use client";

import { ArrowLeft, ArrowRight, MapPin, Sparkle } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { StylistPlatform } from "@/app/ai-stylist/components/desktop/StylistPlatform";
import { WeatherPill } from "@/app/shared/components/weather-pill";
import { useWeather } from "@/app/shared/hooks/useWeather";
import { SHOP_AI_STYLIST_MENS_SCENARIO_LOOKS } from "./shopAIStylistScenarioMensLooks.data";
import { SHOP_AI_STYLIST_SCENARIO_LOOKS } from "./shopAIStylistScenarioLooks.data";
import type { ShopAIStylistScenarioLook } from "./shopAIStylistScenarioLooks.data";
import {
  getWeddingRoleLooks,
  getWeddingStageComposition,
  SHOP_BUDGET_SCENARIO_COUNT,
  SHOP_WEDDING_ROLE_OPTIONS,
} from "./shopAIStylistWeddingLooks.data";
import type {
  ShopStylistGender,
  ShopWeddingRole,
} from "./shopAIStylistWeddingLooks.data";
import styles from "./shopAIStylistScenario.module.css";

const GENDERS = [
  { id: "women", label: "Women" },
  { id: "men", label: "Men" },
] as const;

const OCCASIONS = [
  { id: "everyday", label: "Everyday" },
  { id: "work", label: "Work" },
  { id: "date-night", label: "Date night" },
  { id: "event", label: "Event" },
  { id: "wedding", label: "Wedding" },
] as const;

const SOURCE_OCCASIONS: readonly ShopAIStylistScenarioLook["occasion"][] = [
  "everyday",
  "work",
  "date-night",
  "event",
];

const SEASONS = ["Spring", "Summer", "Fall", "Winter"] as const;
const BUDGETS = ["Under $150", "$150–$300", "$300+"] as const;
const MEN_STYLIST_PREVIEW_IMAGES: string[] = [
  "/media/global-shop/ai-stylist-men-v2/preview/look-01-charcoal-tailoring.png",
  "/media/global-shop/ai-stylist-men-v2/preview/look-02-sage-overshirt.png",
  "/media/global-shop/ai-stylist-men-v2/preview/look-03-camel-suede.png",
  "/media/global-shop/ai-stylist-men-v2/preview/look-04-ivory-blazer.png",
  "/media/global-shop/ai-stylist-men-v2/preview/look-05-indigo-denim.png",
];

const SHOP_PLATFORM_TUNING = {
  centerBrightness: 103,
  discBottom: -10,
  discPerspective: 94,
  discScale: 89,
  discTilt: -9,
  modelOffsetX: 0,
  modelOffsetY: -10,
  modelScale: 130,
  modelSpacing: 87,
} as const;

type OccasionId = (typeof OCCASIONS)[number]["id"];
type Season = (typeof SEASONS)[number];
type Budget = (typeof BUDGETS)[number];
type ExperienceMode = "intro" | "wizard" | "results";

interface ScenarioSelection {
  budget: Budget;
  gender: ShopStylistGender;
  occasion: OccasionId;
  season: Season;
  weddingRole: ShopWeddingRole;
}

export interface BudgetMatchedScenarioLook {
  image: string;
  outfit: string;
  position: number;
  title: string;
  totalPrice: number;
  personRule?: "fixed" | "rotating";
  role?: ShopWeddingRole;
}

const BUDGET_TOTALS: Record<Budget, readonly number[]> = {
  "Under $150": [89, 108, 122, 136, 149],
  "$150–$300": [168, 198, 232, 268, 296],
  "$300+": [338, 415, 485, 560, 690],
};

const ROLE_LABELS: Record<ShopWeddingRole, string> = {
  bride: "Bride",
  bridesmaid: "Bridesmaid",
  mother: "Mother",
  groom: "Groom",
  usher: "Usher",
};

const INITIAL_SCENARIO: ScenarioSelection = {
  budget: "$150–$300",
  gender: "women",
  occasion: "date-night",
  season: "Spring",
  weddingRole: "bride",
};

export function getScenarioLooks(
  gender: ShopStylistGender,
  occasion: OccasionId,
  season: Season,
  budget: Budget,
  weddingRole: ShopWeddingRole,
): BudgetMatchedScenarioLook[] {
  const totals = BUDGET_TOTALS[budget];

  if (occasion === "wedding") {
    const weddingLooks = getWeddingRoleLooks(gender, weddingRole);
    const budgetOffset = BUDGETS.indexOf(budget);
    return weddingLooks.map((_, index) => ({
      ...weddingLooks[(index + budgetOffset) % weddingLooks.length],
      totalPrice: totals[index],
    }));
  }

  const sourceLooks =
    gender === "men"
      ? SHOP_AI_STYLIST_MENS_SCENARIO_LOOKS
      : SHOP_AI_STYLIST_SCENARIO_LOOKS;
  const exactMatches = sourceLooks.filter(
    (look) => look.occasion === occasion && look.season === season,
  );
  if (exactMatches.length !== 5) {
    throw new Error(
      `AI Stylist scenario ${gender}/${occasion}/${season} requires five looks.`,
    );
  }

  const occasionIndex = SOURCE_OCCASIONS.indexOf(occasion);
  const lowerOccasion = SOURCE_OCCASIONS[Math.max(0, occasionIndex - 1)];
  const higherOccasion =
    SOURCE_OCCASIONS[
      Math.min(SOURCE_OCCASIONS.length - 1, occasionIndex + 1)
    ];
  const lowerMatches = sourceLooks.filter(
    (look) => look.occasion === lowerOccasion && look.season === season,
  );
  const higherMatches = sourceLooks.filter(
    (look) => look.occasion === higherOccasion && look.season === season,
  );

  let budgetMix: readonly ShopAIStylistScenarioLook[] = exactMatches;

  if (budget === "Under $150" && occasionIndex > 0) {
    budgetMix = [
      exactMatches[0],
      exactMatches[1],
      lowerMatches[2],
      lowerMatches[3],
      lowerMatches[4],
    ];
  } else if (budget === "$150–$300" && occasionIndex === 0) {
    budgetMix = [
      exactMatches[0],
      exactMatches[1],
      exactMatches[2],
      higherMatches[3],
      higherMatches[4],
    ];
  } else if (
    budget === "$150–$300" &&
    occasionIndex === SOURCE_OCCASIONS.length - 1
  ) {
    budgetMix = [
      exactMatches[0],
      exactMatches[1],
      exactMatches[2],
      lowerMatches[3],
      lowerMatches[4],
    ];
  } else if (
    budget === "$300+" &&
    occasionIndex < SOURCE_OCCASIONS.length - 1
  ) {
    budgetMix = [
      exactMatches[0],
      exactMatches[1],
      higherMatches[2],
      higherMatches[3],
      higherMatches[4],
    ];
  }

  const budgetOffset = BUDGETS.indexOf(budget);
  return budgetMix.map((_, index) => ({
    ...budgetMix[(index + budgetOffset) % budgetMix.length],
    totalPrice: totals[index],
  }));
}

export function ShopAIStylistScenarioSection() {
  const { weather: shopWeather, isLoading: isWeatherLoading } = useWeather({
    locationSource: "ip",
  });
  const [gender, setGender] = useState<ShopStylistGender>(INITIAL_SCENARIO.gender);
  const [occasion, setOccasion] = useState<OccasionId>(INITIAL_SCENARIO.occasion);
  const [season, setSeason] = useState<Season>(INITIAL_SCENARIO.season);
  const [budget, setBudget] = useState<Budget>(INITIAL_SCENARIO.budget);
  const [weddingRole, setWeddingRole] = useState<ShopWeddingRole>(
    INITIAL_SCENARIO.weddingRole,
  );
  const [appliedScenario, setAppliedScenario] =
    useState<ScenarioSelection>(INITIAL_SCENARIO);
  const [activeLook, setActiveLook] = useState(0);
  const [mode, setMode] = useState<ExperienceMode>("intro");
  const [step, setStep] = useState(0);

  const scenarioLooks = useMemo(
    () =>
      getScenarioLooks(
        appliedScenario.gender,
        appliedScenario.occasion,
        appliedScenario.season,
        appliedScenario.budget,
        appliedScenario.weddingRole,
      ),
    [appliedScenario],
  );

  const activeOccasion =
    OCCASIONS.find((item) => item.id === appliedScenario.occasion) ?? OCCASIONS[0];
  const activeGender =
    GENDERS.find((item) => item.id === appliedScenario.gender) ?? GENDERS[0];
  const isWedding = occasion === "wedding";
  const isAppliedWedding = appliedScenario.occasion === "wedding";
  const stepCount = 4;
  const visualStep = step + 1;
  const showMenWizardPreview = mode === "wizard" && gender === "men";
  const weddingStageComposition = isAppliedWedding
    ? getWeddingStageComposition(
        appliedScenario.gender,
        appliedScenario.weddingRole,
      )
    : null;
  const stageImages = showMenWizardPreview
    ? MEN_STYLIST_PREVIEW_IMAGES
    : weddingStageComposition
      ? [...weddingStageComposition.images]
      : scenarioLooks.map((look) => look.image);
  const scenarioSummary = isAppliedWedding
    ? `${activeGender.label} · Wedding · ${ROLE_LABELS[appliedScenario.weddingRole]} · ${appliedScenario.budget}`
    : `${activeGender.label} · ${activeOccasion.label} · ${appliedScenario.season} · ${appliedScenario.budget}`;
  const liveWeatherSummary = shopWeather
    ? `${shopWeather.location}${shopWeather.country ? `, ${shopWeather.country}` : ""} · ${shopWeather.temperature} · ${shopWeather.condition}`
    : isWeatherLoading
      ? "Detecting location and live weather…"
      : "Live weather unavailable";

  function chooseGender(nextGender: ShopStylistGender) {
    setGender(nextGender);
    setWeddingRole(nextGender === "women" ? "bride" : "groom");
    setActiveLook(0);
  }

  function generateLooks() {
    setActiveLook(0);
    setAppliedScenario({ budget, gender, occasion, season, weddingRole });
    setMode("results");
  }

  return (
    <section
      className={styles.section}
      id="ai-stylist-scenario"
      aria-labelledby="ai-stylist-scenario-title"
    >
      <div className={styles.intro}>
        <p>AI Stylist · Live scenario</p>
        <h2 id="ai-stylist-scenario-title">
          One you.
          <br />
          <em>Five ways to arrive.</em>
        </h2>
        <span>
          Choose who, the moment, and your budget. Add a season for everyday
          styling—or choose a role for a Wedding.
        </span>
      </div>

      <div className={styles.experience}>
        <aside className={styles.controls} aria-label="AI Stylist scenario">
          {mode !== "intro" && (
            <div className={styles.controlsHeader}>
              <span>
                <Sparkle size={16} weight="fill" /> Build your scenario
              </span>
              <small>
                {mode === "wizard"
                  ? `Step ${visualStep} of ${stepCount}`
                  : `5 looks · ${SHOP_BUDGET_SCENARIO_COUNT} scenarios`}
              </small>
            </div>
          )}

          {mode === "intro" && (
            <div className={styles.startView}>
              <h3 className={styles.startGreeting}>Hey!</h3>
              <div className={styles.weatherPill} aria-live="polite">
                {shopWeather ? (
                  <WeatherPill data={shopWeather} size="md" />
                ) : (
                  <span className={styles.weatherStatus}>
                    {isWeatherLoading
                      ? "Detecting your location and weather…"
                      : "Live weather unavailable"}
                  </span>
                )}
              </div>
              <div className={styles.startCopy}>
                <p>
                  Tell us who you&apos;re styling and where you&apos;re headed. We&apos;ll
                  create five complete looks made for your moment.
                </p>
                <p>
                  Dressing for a wedding? Choose your role—Bride, Bridesmaid,
                  Mother of bride, Groom, Usher, or Mother of groom—and let
                  your personal stylist take it from there.
                </p>
              </div>
              <button
                className={`${styles.generateButton} ${styles.startButton}`}
                type="button"
                onClick={() => {
                  setStep(0);
                  setMode("wizard");
                }}
              >
                Start Styling
                <ArrowRight size={18} weight="bold" />
              </button>
            </div>
          )}

          {mode === "wizard" && (
            <div className={styles.wizardView}>
              <div className={styles.progress} aria-hidden="true">
                <span style={{ width: `${(visualStep / stepCount) * 100}%` }} />
              </div>

              {step === 0 && (
                <fieldset>
                  <legend>
                    <span>01</span> Who are we styling?
                  </legend>
                  <div className={styles.genderGrid}>
                    {GENDERS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={gender === item.id}
                        onClick={() => chooseGender(item.id)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}

              {step === 1 && (
                <fieldset>
                  <legend>
                    <span>02</span> What is the occasion?
                  </legend>
                  <div className={styles.occasionGrid}>
                    {OCCASIONS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={occasion === item.id}
                        onClick={() => {
                          setOccasion(item.id);
                          setActiveLook(0);
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}

              {step === 2 && !isWedding && (
                <fieldset>
                  <legend>
                    <span>03</span> Which season are you styling?
                  </legend>
                  <div className={styles.optionGrid}>
                    {SEASONS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        aria-pressed={season === item}
                        onClick={() => {
                          setSeason(item);
                          setActiveLook(0);
                        }}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}

              {step === 2 && isWedding && (
                <fieldset>
                  <legend>
                    <span>03</span> What is your Wedding role?
                  </legend>
                  <div className={styles.weddingRoles} aria-live="polite">
                    <div className={styles.roleGrid}>
                      {SHOP_WEDDING_ROLE_OPTIONS[gender].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          aria-pressed={weddingRole === item.id}
                          onClick={() => {
                            setWeddingRole(item.id);
                            setActiveLook(0);
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <small>No season or garment type needed for Wedding.</small>
                  </div>
                </fieldset>
              )}

              {step === 3 && (
                <fieldset>
                  <legend>
                    <span>04</span> What is your outfit budget?
                  </legend>
                  <div className={styles.optionGrid}>
                    {BUDGETS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        aria-pressed={budget === item}
                        onClick={() => {
                          setBudget(item);
                          setActiveLook(0);
                        }}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}

              <div className={styles.wizardActions}>
                <button
                  className={styles.backButton}
                  type="button"
                  onClick={() => {
                    if (step === 0) setMode("intro");
                    else setStep((current) => current - 1);
                  }}
                >
                  <ArrowLeft size={16} weight="bold" /> Back
                </button>
                <button
                  className={styles.generateButton}
                  type="button"
                  onClick={() => {
                    if (step < 3) setStep((current) => current + 1);
                    else generateLooks();
                  }}
                >
                  {step < 3
                    ? "Continue"
                    : isWedding &&
                        (weddingRole === "bridesmaid" ||
                          weddingRole === "usher" ||
                          weddingRole === "mother")
                      ? "Build wedding party"
                      : "Create 5 outfits"}
                  <ArrowRight size={18} weight="bold" />
                </button>
              </div>
            </div>
          )}

          {mode === "results" && (
            <div className={styles.resultsView}>
              <span className={styles.readyBadge}>
                <Sparkle size={17} weight="fill" />{" "}
                {weddingStageComposition
                  ? "Wedding party composition loaded"
                  : "Five budget-matched outfits loaded"}
              </span>
              <h3>Styled for your scenario.</h3>
              <p>{scenarioSummary}</p>
              {weddingStageComposition ? (
                <div
                  className={styles.partyComposition}
                  aria-label="Wedding party arrangement loaded on the disc"
                >
                  <span>On your disc</span>
                  <strong>{weddingStageComposition.label}</strong>
                  <small>
                    {weddingStageComposition.visiblePeople === 2
                      ? "Only the two requested people are shown."
                      : "The main wedding look stays centered with four coordinated friends around it."}
                  </small>
                </div>
              ) : (
                <div
                  className={styles.discLooks}
                  aria-label="Outfits loaded on the disc"
                >
                  <span>On your disc</span>
                  <div>
                    {scenarioLooks.map((look, index) => (
                      <button
                        key={`${look.image}-${index}`}
                        type="button"
                        aria-label={`Center ${look.title}`}
                        aria-pressed={activeLook === index}
                        onClick={() => setActiveLook(index)}
                      >
                        <small>{String(index + 1).padStart(2, "0")}</small>
                        <strong>{look.title}</strong>
                        <span className={styles.lookPrice}>
                          ${look.totalPrice} budget target
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <p className={styles.budgetMatch}>
                {weddingStageComposition
                  ? `The selected wedding-party wardrobe targets ${appliedScenario.budget}. Product matching comes next.`
                  : `Five outfit concepts target ${appliedScenario.budget}. Product matching comes next.`}
              </p>
              {isAppliedWedding && (
                <p className={styles.sourceNote}>
                  Wedding role styling · no season or garment-type selection.
                </p>
              )}
              <div className={styles.locationPill}>
                <MapPin size={17} weight="fill" />
                <span>
                  <small>IP location · live weather</small>
                  {liveWeatherSummary}
                </span>
              </div>
              <button
                className={styles.generateButton}
                type="button"
                onClick={() => {
                  setStep(0);
                  setMode("wizard");
                }}
              >
                Style another scenario
                <ArrowRight size={18} weight="bold" />
              </button>
            </div>
          )}
        </aside>

        <div className={styles.resultStage}>
          <div className={styles.realTurntable}>
            <StylistPlatform
              key={showMenWizardPreview
                ? "men-five-look-preview"
                : `${appliedScenario.gender}-${appliedScenario.occasion}-${isAppliedWedding ? appliedScenario.weddingRole : appliedScenario.season}-${appliedScenario.budget}`}
              outfits={[]}
              modelImageUrl={null}
              slotImages={stageImages}
              slotImageScales={weddingStageComposition?.imageScales}
              fillContainer
              showRotationGuide={!showMenWizardPreview && !weddingStageComposition}
              imageAlt={(index) =>
                showMenWizardPreview
                  ? `The same menswear model in preview outfit ${index + 1}`
                  : weddingStageComposition
                    ? weddingStageComposition.alt[index] ?? ""
                    : `${isAppliedWedding ? ROLE_LABELS[appliedScenario.weddingRole] : "AI Stylist model"} wearing ${scenarioLooks[index].outfit}`
              }
              selectedIndex={
                showMenWizardPreview || weddingStageComposition ? 0 : activeLook
              }
              onSelectedIndexChange={
                showMenWizardPreview || weddingStageComposition
                  ? undefined
                  : setActiveLook
              }
              initialTuning={SHOP_PLATFORM_TUNING}
              labels={{
                dragSurface:
                  "Drag left or right to rotate the MyAIFitting styling platform",
                previous: "Rotate platform left",
                next: "Rotate platform right",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
