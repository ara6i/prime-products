// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import {
  getScenarioLooks,
  ShopAIStylistScenarioSection,
} from "./ShopAIStylistScenarioSection";
import { SHOP_AI_STYLIST_MENS_SCENARIO_LOOKS } from "./shopAIStylistScenarioMensLooks.data";
import { SHOP_AI_STYLIST_SCENARIO_LOOKS } from "./shopAIStylistScenarioLooks.data";
import {
  getWeddingStageComposition,
  SHOP_AI_STYLIST_WEDDING_LOOKS,
  SHOP_BASE_SCENARIO_COUNT,
  SHOP_BUDGET_SCENARIO_COUNT,
  SHOP_WOMEN_WEDDING_CENTER_MODEL_IMAGE,
} from "./shopAIStylistWeddingLooks.data";

vi.mock("@/app/shared/hooks/useWeather", () => ({
  useWeather: () => ({
    weather: {
      location: "Yerevan",
      country: "AM",
      temperature: "26°C",
      icon: "cloud",
      condition: "Broken clouds",
    },
    weatherContext: {
      city: "Yerevan",
      country: "AM",
      temperature: 26,
      condition: "cloudy",
    },
    isLoading: false,
  }),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

afterEach(() => cleanup());

it("speaks to shoppers instead of explaining internal flow rules", () => {
  render(<ShopAIStylistScenarioSection />);

  expect(
    screen.getByText(/We'll create five complete looks made for your moment/i),
  ).toBeTruthy();
  expect(
    screen.getByText(/let your personal stylist take it from there/i),
  ).toBeTruthy();
  expect(screen.queryByText(/Wedding changes the flow/i)).toBeNull();
});

it("maps 80 unique images for women and 80 for men into five-look scenarios", () => {
  [
    SHOP_AI_STYLIST_SCENARIO_LOOKS,
    SHOP_AI_STYLIST_MENS_SCENARIO_LOOKS,
  ].forEach((looks) => {
    expect(looks).toHaveLength(80);
    expect(new Set(looks.map((look) => look.image)).size).toBe(80);

    const scenarioCounts = new Map<string, number>();
    looks.forEach((look) => {
      const key = `${look.occasion}/${look.season}`;
      scenarioCounts.set(key, (scenarioCounts.get(key) ?? 0) + 1);
    });
    expect(scenarioCounts.size).toBe(16);
    expect([...scenarioCounts.values()].every((count) => count === 5)).toBe(true);
  });
});

it("counts Wedding once per role instead of multiplying it by four seasons", () => {
  expect(SHOP_AI_STYLIST_WEDDING_LOOKS).toHaveLength(30);
  expect(SHOP_BASE_SCENARIO_COUNT).toBe(2 * 4 * 4 + 6);
  expect(SHOP_BUDGET_SCENARIO_COUNT).toBe((2 * 4 * 4 + 6) * 3);
  expect(
    SHOP_AI_STYLIST_WEDDING_LOOKS.every(
      (look) => !("season" in look) && !("occasion" in look),
    ),
  ).toBe(true);
});

it("builds five correctly priced non-Wedding looks for both genders", () => {
  const genders = ["women", "men"] as const;
  const occasions = ["everyday", "work", "date-night", "event"] as const;
  const seasons = ["Spring", "Summer", "Fall", "Winter"] as const;
  const budgets = ["Under $150", "$150–$300", "$300+"] as const;

  genders.forEach((gender) => {
    occasions.forEach((occasion) => {
      seasons.forEach((season) => {
        budgets.forEach((budget, budgetIndex) => {
          const looks = getScenarioLooks(
            gender,
            occasion,
            season,
            budget,
            gender === "women" ? "bride" : "groom",
          );
          expect(looks).toHaveLength(5);
          expect(new Set(looks.map((look) => look.image)).size).toBe(5);
          if (budgetIndex === 0) {
            expect(looks.every((look) => look.totalPrice < 150)).toBe(true);
          } else if (budgetIndex === 1) {
            expect(
              looks.every(
                (look) => look.totalPrice >= 150 && look.totalPrice <= 300,
              ),
            ).toBe(true);
          } else {
            expect(looks.every((look) => look.totalPrice > 300)).toBe(true);
          }
        });
      });
    });
  });
});

it("gives the same Bride and Groom five distinct looks and builds party compositions", () => {
  const bride = getScenarioLooks(
    "women",
    "wedding",
    "Spring",
    "$150–$300",
    "bride",
  );
  const groom = getScenarioLooks(
    "men",
    "wedding",
    "Winter",
    "$150–$300",
    "groom",
  );
  const bridesmaids = getScenarioLooks(
    "women",
    "wedding",
    "Fall",
    "$150–$300",
    "bridesmaid",
  );
  const ushers = getScenarioLooks(
    "men",
    "wedding",
    "Summer",
    "$150–$300",
    "usher",
  );

  expect(new Set(bride.map((look) => look.image)).size).toBe(5);
  expect(new Set(groom.map((look) => look.image)).size).toBe(5);
  expect(new Set(bridesmaids.map((look) => look.image)).size).toBe(5);
  expect(new Set(ushers.map((look) => look.image)).size).toBe(5);
  expect(bride.every((look) => look.personRule === "fixed")).toBe(true);
  expect(groom.every((look) => look.personRule === "fixed")).toBe(true);

  const bridesmaidStage = getWeddingStageComposition("women", "bridesmaid");
  const motherOfBrideStage = getWeddingStageComposition("women", "mother");
  const usherStage = getWeddingStageComposition("men", "usher");
  const motherOfGroomStage = getWeddingStageComposition("men", "mother");

  expect(bridesmaidStage?.visiblePeople).toBe(5);
  expect(bridesmaidStage?.images.filter(Boolean)).toHaveLength(5);
  expect(bride[0]?.image).toBe(SHOP_WOMEN_WEDDING_CENTER_MODEL_IMAGE);
  expect(bridesmaidStage?.images[0]).toBe(
    SHOP_WOMEN_WEDDING_CENTER_MODEL_IMAGE,
  );
  expect(motherOfBrideStage?.images[0]).toBe(
    SHOP_WOMEN_WEDDING_CENTER_MODEL_IMAGE,
  );
  expect(usherStage?.visiblePeople).toBe(5);
  expect(usherStage?.images.filter(Boolean)).toHaveLength(5);
  expect(motherOfBrideStage?.images.filter(Boolean)).toHaveLength(2);
  expect(motherOfGroomStage?.images.filter(Boolean)).toHaveLength(2);
});

it("places the five initial results on the real interactive disc", async () => {
  const user = userEvent.setup();
  render(<ShopAIStylistScenarioSection />);

  const section = within(
    screen.getByRole("region", { name: /One you\. Five complete looks\./i }),
  );
  const models = section.getAllByAltText(/AI Stylist model wearing/i);
  expect(models).toHaveLength(5);
  expect(new Set(models.map((model) => model.getAttribute("src"))).size).toBe(5);

  const disc = section.getByRole("slider", {
    name: /rotate the MyAIFitting styling platform/i,
  });
  expect(disc.getAttribute("aria-valuenow")).toBe("1");

  await user.click(section.getByRole("button", { name: "Adjust disc layout" }));
  expect(
    screen.getByRole("dialog", { name: "Adjust disc and model layout" }),
  ).toBeTruthy();
  expect(
    (screen.getByRole("slider", { name: "Model size" }) as HTMLInputElement)
      .value,
  ).toBe("130");
  expect(
    (screen.getByRole("slider", { name: "Disc size" }) as HTMLInputElement)
      .value,
  ).toBe("89");

  await user.click(section.getByRole("button", { name: "Rotate platform right" }));
  expect(disc.getAttribute("aria-valuenow")).toBe("2");
});

it("supports the full men's occasion, season, and budget flow", async () => {
  const user = userEvent.setup();
  render(<ShopAIStylistScenarioSection />);

  await user.click(screen.getByRole("button", { name: "Start Styling" }));
  expect(screen.getByText("Step 1 of 4")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Event" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Men" }));
  const previewSources = screen
    .getAllByAltText(/same menswear model in preview outfit/i)
    .map((model) => model.getAttribute("src"));
  expect(previewSources).toHaveLength(5);
  expect(new Set(previewSources).size).toBe(5);
  expect(
    previewSources.every((source) =>
      source?.includes("ai-stylist-men-v2/preview"),
    ),
  ).toBe(true);
  await user.click(screen.getByRole("button", { name: "Continue" }));
  expect(screen.getByText("Step 2 of 4")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Event" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  expect(screen.getByText("Step 3 of 4")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Winter" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  expect(screen.getByText("Step 4 of 4")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "$300+" }));
  await user.click(screen.getByRole("button", { name: "Create 5 outfits" }));

  expect(screen.getByText("Men · Event · Winter · $300+")).toBeTruthy();
  const resultSources = screen
    .getAllByAltText(/AI Stylist model wearing/i)
    .map((model) => model.getAttribute("src"));
  expect(resultSources).toHaveLength(5);
  expect(
    resultSources.every((source) =>
      source?.includes("ai-stylist-scenarios-men-v1/event-winter"),
    ),
  ).toBe(true);
});

it("shows women's Wedding roles on their own step and skips Season", async () => {
  const user = userEvent.setup();
  render(<ShopAIStylistScenarioSection />);

  await user.click(screen.getByRole("button", { name: "Start Styling" }));
  expect(screen.queryByRole("button", { name: "Wedding" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.click(screen.getByRole("button", { name: "Wedding" }));
  expect(screen.queryByRole("button", { name: "Bride" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Continue" }));
  expect(screen.getByText("Step 3 of 4")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Bride" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Bridesmaid" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Mother of the Bride" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Groom" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Spring" })).toBeNull();
  expect(screen.getByText("No season or garment type needed for Wedding.")).toBeTruthy();

  await user.click(screen.getByRole("button", { name: "Bridesmaid" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  expect(screen.getByText("Step 4 of 4")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Spring" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "$150–$300" }));
  await user.click(screen.getByRole("button", { name: "Build wedding party" }));

  expect(
    screen.getByText("Women · Wedding · Bridesmaid · $150–$300"),
  ).toBeTruthy();
  expect(
    screen.getByText(
      "Wedding role styling · no season or garment-type selection.",
    ),
  ).toBeTruthy();
  expect(screen.getAllByAltText(/Bride centered/i)).toHaveLength(1);
  expect(screen.getAllByAltText(/Bridesmaid \d in the matching/i)).toHaveLength(4);
});

it("switches Wedding to Groom and Usher for men", async () => {
  const user = userEvent.setup();
  render(<ShopAIStylistScenarioSection />);

  await user.click(screen.getByRole("button", { name: "Start Styling" }));
  await user.click(screen.getByRole("button", { name: "Men" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.click(screen.getByRole("button", { name: "Wedding" }));
  expect(screen.queryByRole("button", { name: "Groom" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Continue" }));
  expect(screen.getByRole("button", { name: "Groom" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Usher" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Mother of the Groom" })).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Usher" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.click(screen.getByRole("button", { name: "Build wedding party" }));

  expect(screen.getByText("Men · Wedding · Usher · $150–$300")).toBeTruthy();
  const [groom] = screen.getAllByAltText(/Groom centered/i);
  expect(groom).toBeTruthy();
  expect(groom.style.objectPosition).toBe("center bottom");
  expect(groom.parentElement?.style.transform).toContain("scale(1.22)");
  expect(screen.getAllByAltText(/Usher \d in the matching/i)).toHaveLength(4);
});
