"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  useLandingLanguage,
  type LandingLanguageCode,
} from "@/app/landing/i18n";
import type {
  PolicyPageContent,
  PolicySection,
  PolicySubsection,
} from "@/app/legal-content/types";
import type { InfluencerLandingViewModel } from "@/app/partner-landing/influencer/types";

type CreatorDictionary = Record<string, string>;
type CreatorTextReplacements = Record<string, string | number>;

type CreatorLanguageContextValue = {
  direction: "ltr" | "rtl";
  language: LandingLanguageCode;
  setLanguage: (language: LandingLanguageCode) => void;
  t: (value: string, replacements?: CreatorTextReplacements) => string;
};

const DICTIONARY_LOADERS: Partial<
  Record<LandingLanguageCode, () => Promise<CreatorDictionary>>
> = {
  es: () => import("./translations/es.json").then((module) => module.default),
  fr: () => import("./translations/fr.json").then((module) => module.default),
  de: () => import("./translations/de.json").then((module) => module.default),
  it: () => import("./translations/it.json").then((module) => module.default),
  "pt-BR": () =>
    import("./translations/pt-BR.json").then((module) => module.default),
  ja: () => import("./translations/ja.json").then((module) => module.default),
  "zh-CN": () =>
    import("./translations/zh-CN.json").then((module) => module.default),
  ko: () => import("./translations/ko.json").then((module) => module.default),
  ar: () => import("./translations/ar.json").then((module) => module.default),
};

// These split display headlines need sentence-level context that automatic
// translation cannot infer from either styled fragment in isolation.
const CREATOR_TRANSLATION_OVERRIDES: Partial<
  Record<LandingLanguageCode, CreatorDictionary>
> = {
  es: {
    "Your\ninfluence": "Tu\ninfluencia",
    "should\npay.": "debería\ngenerarte ingresos.",
    "Where your style becomes": "Donde tu estilo se convierte en",
    "a story people can shop.": "una historia que todos pueden comprar.",
    "Your profile becomes": "Tu perfil se convierte en",
    "their fitting room.": "su probador virtual.",
  },
  fr: {
    "Your\ninfluence": "Votre\ninfluence",
    "should\npay.": "devrait\nvous rapporter.",
    "Where your style becomes": "Là où votre style devient",
    "a story people can shop.": "une histoire que chacun peut acheter.",
    "Your profile becomes": "Votre profil devient",
    "their fitting room.": "leur cabine d’essayage.",
  },
  de: {
    "Your\ninfluence": "Ihr\nEinfluss",
    "should\npay.": "sollte sich\nauszahlen.",
    "Where your style becomes": "Wo Ihr Stil zu",
    "a story people can shop.": "einer shoppbaren Story wird.",
    "Your profile becomes": "Ihr Profil wird zu",
    "their fitting room.": "ihrer Umkleidekabine.",
  },
  it: {
    "Your\ninfluence": "La tua\ninfluenza",
    "should\npay.": "dovrebbe\nfruttarti.",
    "Where your style becomes": "Dove il tuo stile diventa",
    "a story people can shop.": "una storia tutta da acquistare.",
    "Your profile becomes": "Il tuo profilo diventa",
    "their fitting room.": "il loro camerino virtuale.",
  },
  "pt-BR": {
    "Your\ninfluence": "Sua\ninfluência",
    "should\npay.": "deve gerar\nretorno.",
    "Where your style becomes": "Onde seu estilo se torna",
    "a story people can shop.": "uma história que todos podem comprar.",
    "Your profile becomes": "Seu perfil se torna",
    "their fitting room.": "o provador virtual do seu público.",
  },
  ja: {
    "Your\ninfluence": "あなたの\n影響力を",
    "should\npay.": "収益に\n変えよう。",
    "Where your style becomes": "あなたのスタイルが",
    "a story people can shop.": "買えるストーリーになる場所。",
    "Your profile becomes": "あなたのプロフィールが",
    "their fitting room.": "みんなの試着室に。",
  },
  "zh-CN": {
    "Your\ninfluence": "你的\n影响力",
    "should\npay.": "理应带来\n收益。",
    "Where your style becomes": "让你的风格化作",
    "a story people can shop.": "人人都能购买的故事。",
    "Your profile becomes": "你的主页变成",
    "their fitting room.": "顾客的虚拟试衣间。",
  },
  ko: {
    "Your\ninfluence": "당신의\n영향력을",
    "should\npay.": "수익으로\n바꾸세요.",
    "Where your style becomes": "당신의 스타일이",
    "a story people can shop.": "누구나 쇼핑할 수 있는 이야기가 됩니다.",
    "Your profile becomes": "당신의 프로필이",
    "their fitting room.": "고객의 가상 피팅룸으로.",
  },
  ar: {
    "Your\ninfluence": "تأثيرك",
    "should\npay.": "يستحق أن\nيدرّ عليك دخلاً.",
    "Where your style becomes": "حيث يصبح أسلوبك",
    "a story people can shop.": "قصة يمكن للجميع التسوق منها.",
    "Your profile becomes": "يصبح ملفك الشخصي",
    "their fitting room.": "غرفة قياس افتراضية لجمهورك.",
  },
};

const CreatorLanguageContext = createContext<CreatorLanguageContextValue | null>(
  null,
);

function replaceTokens(
  value: string,
  replacements?: CreatorTextReplacements,
): string {
  if (!replacements) return value;

  return Object.entries(replacements).reduce(
    (nextValue, [key, replacement]) =>
      nextValue.replaceAll(`{${key}}`, String(replacement)),
    value,
  );
}

export function CreatorLanguageProvider({ children }: { children: ReactNode }) {
  const { language, setLanguage } = useLandingLanguage();
  const direction = language === "ar" ? "rtl" : "ltr";
  const [loadedDictionary, setLoadedDictionary] = useState<{
    language: LandingLanguageCode;
    values: CreatorDictionary;
  }>({ language: "en", values: {} });

  useEffect(() => {
    let active = true;
    const loader = DICTIONARY_LOADERS[language];

    if (!loader) {
      const timeout = window.setTimeout(() => {
        if (active) setLoadedDictionary({ language, values: {} });
      }, 0);
      return () => {
        active = false;
        window.clearTimeout(timeout);
      };
    }

    void loader()
      .then((values) => {
        if (active) setLoadedDictionary({ language, values });
      })
      .catch(() => {
        if (active) setLoadedDictionary({ language, values: {} });
      });

    return () => {
      active = false;
    };
  }, [language]);

  useEffect(() => {
    const root = document.documentElement;
    const previousLanguage = root.lang;
    const previousDirection = root.dir;
    root.lang = language;
    root.dir = direction;

    return () => {
      root.lang = previousLanguage;
      root.dir = previousDirection;
    };
  }, [direction, language]);

  const t = useCallback(
    (value: string, replacements?: CreatorTextReplacements) => {
      const translated =
        CREATOR_TRANSLATION_OVERRIDES[language]?.[value] ??
        (loadedDictionary.language === language
          ? (loadedDictionary.values[value] ?? value)
          : value);
      return replaceTokens(translated, replacements);
    },
    [language, loadedDictionary],
  );

  const contextValue = useMemo<CreatorLanguageContextValue>(
    () => ({
      direction,
      language,
      setLanguage,
      t,
    }),
    [direction, language, setLanguage, t],
  );

  return (
    <CreatorLanguageContext.Provider value={contextValue}>
      {children}
    </CreatorLanguageContext.Provider>
  );
}

export function useCreatorLanguage(): CreatorLanguageContextValue {
  const value = useContext(CreatorLanguageContext);
  if (!value) {
    throw new Error(
      "useCreatorLanguage must be used inside CreatorLanguageProvider.",
    );
  }
  return value;
}

export function useOptionalCreatorLanguage(): CreatorLanguageContextValue | null {
  return useContext(CreatorLanguageContext);
}

function localizePolicySubsection(
  subsection: PolicySubsection,
  t: CreatorLanguageContextValue["t"],
): PolicySubsection {
  return {
    title: t(subsection.title),
    body: subsection.body?.map((paragraph) => t(paragraph)),
    items: subsection.items?.map((item) => t(item)),
  };
}

function localizePolicySection(
  section: PolicySection,
  t: CreatorLanguageContextValue["t"],
): PolicySection {
  return {
    title: t(section.title),
    body: section.body?.map((paragraph) => t(paragraph)),
    items: section.items?.map((item) => t(item)),
    subsections: section.subsections?.map((subsection) =>
      localizePolicySubsection(subsection, t),
    ),
  };
}

export function localizePolicyPage(
  page: PolicyPageContent,
  t: CreatorLanguageContextValue["t"],
): PolicyPageContent {
  return {
    ...page,
    title: t(page.title),
    eyebrow: t(page.eyebrow),
    description: t(page.description),
    lastUpdated: page.lastUpdated ? t(page.lastUpdated) : undefined,
    effectiveDate: page.effectiveDate ? t(page.effectiveDate) : undefined,
    location: page.location ? t(page.location) : undefined,
    intro: page.intro.map((paragraph) => t(paragraph)),
    quickNotes: page.quickNotes.map((note) => t(note)),
    sections: page.sections.map((section) => localizePolicySection(section, t)),
    contactTitle: t(page.contactTitle),
    contactBody: t(page.contactBody),
  };
}

export function localizeInfluencerLandingViewModel(
  viewModel: InfluencerLandingViewModel,
  t: CreatorLanguageContextValue["t"],
): InfluencerLandingViewModel {
  return {
    hero: {
      ...viewModel.hero,
      eyebrow: t(viewModel.hero.eyebrow),
      titleLead: t(viewModel.hero.titleLead),
      titleAccent: t(viewModel.hero.titleAccent),
      body: t(viewModel.hero.body),
      primaryCta: t(viewModel.hero.primaryCta),
      secondaryCta: t(viewModel.hero.secondaryCta),
      annotation: t(viewModel.hero.annotation),
    },
    features: viewModel.features.map((feature) => ({
      ...feature,
      title: t(feature.title),
      description: t(feature.description),
      note: t(feature.note),
    })),
    journey: viewModel.journey.map((step) => ({
      ...step,
      title: t(step.title),
      description: t(step.description),
    })),
    commissionLabels: viewModel.commissionLabels.map((label) => t(label)),
    interest: {
      title: t(viewModel.interest.title),
      body: t(viewModel.interest.body),
    },
  };
}
