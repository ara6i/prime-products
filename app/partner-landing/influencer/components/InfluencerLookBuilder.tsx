"use client";

import {
  ArrowRight,
  FilmStrip,
  Fire,
  HandPointing,
  Heart,
  MagicWand,
  Play,
  Scissors,
  Smiley,
  Sparkle,
  Sticker,
  TrendUp,
} from "@phosphor-icons/react";
import Image from "next/image";
import { useState } from "react";
import { useCreatorLanguage } from "../../i18n/CreatorLanguageProvider";
import styles from "./influencerLanding.module.css";

const EDITORIAL_IMAGE = "/media/partner-landing/optimized/look-builder-editorial.webp";

const FILTERS = [
  { id: "pearl", label: "Pearl White" },
  { id: "clear", label: "Clear" },
  { id: "fireworks", label: "Fireworks" },
  { id: "cherry", label: "Cherry Bloom" },
] as const;

const STICKERS = [
  { id: "spark", label: "Spark", Icon: Sparkle },
  { id: "heart", label: "Heart", Icon: Heart },
  { id: "trend", label: "Trend", Icon: TrendUp },
  { id: "point", label: "Point", Icon: HandPointing },
  { id: "smile", label: "Smile", Icon: Smiley },
  { id: "arrow", label: "Arrow", Icon: ArrowRight },
  { id: "fire", label: "Fire", Icon: Fire },
  { id: "magic", label: "Magic", Icon: MagicWand },
  { id: "sticker", label: "Sticker", Icon: Sticker },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];
type StickerId = (typeof STICKERS)[number]["id"];
type EditorTool = "effects" | "stickers";

export function InfluencerLookBuilder() {
  const [activeFilter, setActiveFilter] = useState<FilterId>("clear");
  const [activeSticker, setActiveSticker] = useState<StickerId>("heart");
  const [activeFrame, setActiveFrame] = useState(3);
  const [activeTool, setActiveTool] = useState<EditorTool>("effects");
  const { t } = useCreatorLanguage();

  return (
    <section id="look-builder" className={styles.lookBuilder} aria-labelledby="look-builder-title">
      <div className={styles.lookBuilderIntro}>
        <p className={styles.eyebrow}>{t("Your look, your edit")}</p>
        <h2 id="look-builder-title">{t("Build the outfit.")} <em>{t("Share the story.")}</em></h2>
        <p>{t("Turn campaign pieces into your own edit. Style the fit, add your voice, and make every frame ready to share.")}</p>
      </div>

      <div id="outfit-editor-demo" className={styles.lookEditor} data-tool={activeTool}>
        <div className={styles.editorCanvas} data-filter={activeFilter} aria-live="polite">
          <Image
            className={styles.editorCanvasImage}
            src={EDITORIAL_IMAGE}
            alt={t("Creator in vivid orange and yellow fashion styling")}
            fill
            sizes="(max-width: 680px) 92vw, 760px"
          />
          <div className={styles.editorTextSelection} aria-label={t("Selected title: I’m Cool")}>
            <i aria-hidden="true" />
            <strong>{t("I’m Cool")}</strong>
            <i aria-hidden="true" />
            <i aria-hidden="true" />
            <i aria-hidden="true" />
          </div>
        </div>

        <div className={styles.editorFilters} aria-label={t("Choose a video filter")}>
          <strong>{t("Filters")}</strong>
          <div>
            {FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                aria-pressed={activeFilter === filter.id}
                onClick={() => {
                  setActiveFilter(filter.id);
                  setActiveTool("effects");
                }}
              >
                <span data-filter={filter.id}>
                  <Image src={EDITORIAL_IMAGE} alt="" fill sizes="56px" />
                </span>
                <small>{t(filter.label)}</small>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.editorStickers} aria-label={t("Choose a sticker")}>
          <strong>{t("Stickers")}</strong>
          <nav aria-label={t("Sticker categories")}>
            <button type="button" aria-pressed="true">{t("Basics")}</button>
            <button type="button">{t("Weather")}</button>
          </nav>
          <div>
            {STICKERS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                aria-label={t(label)}
                aria-pressed={activeSticker === id}
                onClick={() => {
                  setActiveSticker(id);
                  setActiveTool("stickers");
                }}
              >
                <Icon size={26} weight={activeSticker === id ? "fill" : "duotone"} />
              </button>
            ))}
          </div>
          <ArrowRight className={styles.stickerArrow} size={32} weight="fill" aria-hidden="true" />
        </div>

        <div className={styles.editorHeroSticker} aria-label={t("Heart eyes sticker selected")}>
          <Smiley size={60} weight="bold" />
          <Heart className={styles.stickerHeartLeft} size={21} weight="fill" />
          <Heart className={styles.stickerHeartRight} size={21} weight="fill" />
        </div>

        <div className={styles.editorRuler} aria-hidden="true">
          <span>00:00:20</span>
          <span>00:00:30</span>
          <span>00:00:40</span>
          <span>00:00:50</span>
          <i />
        </div>

        <div className={styles.editorTimeline} aria-label={t("Video timeline")}>
          <FilmStrip size={15} weight="fill" aria-hidden="true" />
          <button type="button" aria-label={t("Previous frame")}><ArrowRight size={15} weight="bold" /></button>
          <div>
            {Array.from({ length: 7 }, (_, index) => (
              <button
                key={index}
                type="button"
                aria-label={t("Select frame {number}", { number: index + 1 })}
                aria-pressed={activeFrame === index}
                onClick={() => setActiveFrame(index)}
              >
                <Image src={EDITORIAL_IMAGE} alt="" fill sizes="90px" />
                {index === 3 ? <Scissors size={18} weight="bold" aria-hidden="true" /> : null}
              </button>
            ))}
          </div>
          <button type="button" aria-label={t("Next frame")}><ArrowRight size={15} weight="bold" /></button>
        </div>

        <button
          className={`${styles.editorAction} ${styles.editorEffectsAction}`}
          type="button"
          aria-pressed={activeTool === "effects"}
          onClick={() => setActiveTool("effects")}
        >
          <MagicWand size={26} weight="fill" /> {t("Effects")}
        </button>
        <button
          className={`${styles.editorAction} ${styles.editorStickersAction}`}
          type="button"
          aria-pressed={activeTool === "stickers"}
          onClick={() => setActiveTool("stickers")}
        >
          <Smiley size={26} weight="fill" /> {t("Stickers")}
        </button>
        <button className={styles.editorPlay} type="button" aria-label={t("Play outfit story")}>
          <Play size={16} weight="fill" />
        </button>
      </div>
    </section>
  );
}
