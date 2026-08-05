import { ArrowUpRight, Camera, FilmStrip, ShareNetwork, Sparkle } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import styles from "./influencerLanding.module.css";

const CREATOR_STORIES = [
  {
    src: "/media/partner-landing/creator-collective-01.png",
    step: "Try it on",
    note: "See the full look on you",
    icon: Camera,
  },
  {
    src: "/media/partner-landing/creator-collective-02.png",
    step: "Build the look",
    note: "Style campaign pieces together",
    icon: Sparkle,
  },
  {
    src: "/media/partner-landing/creator-collective-03.png",
    step: "Direct the story",
    note: "Create photos and video",
    icon: FilmStrip,
  },
  {
    src: "/media/partner-landing/creator-collective-04.png",
    step: "Share & earn",
    note: "Publish every shoppable look",
    icon: ShareNetwork,
  },
] as const;

export function InfluencerCreatorCollective() {
  return (
    <section
      id="creator-collective"
      className={styles.creatorCollective}
      aria-labelledby="creator-collective-title"
    >
      <div className={styles.collectiveCopy}>
        <span className={styles.collectivePill}>
          <Sparkle size={15} weight="fill" /> Creator collective · built to be shared
        </span>
        <h2 id="creator-collective-title">
          Where your style becomes <em>a story people can shop.</em>
        </h2>
        <p>
          Try on campaign pieces yourself, build complete outfits, and turn every look into
          polished photos and videos your audience can discover, share, and shop.
        </p>
        <Link className={styles.collectiveCta} href="/influencers/dashboard/outfit-studio">
          Open Outfit Studio <ArrowUpRight size={18} weight="bold" />
        </Link>
      </div>

      <div className={styles.collectivePortraits}>
        {CREATOR_STORIES.map(({ src, step, note, icon: Icon }, index) => (
          <article key={src} className={styles.collectivePortrait}>
            <div className={styles.collectiveImageFrame}>
              <Image
                src={src}
                alt={`${step}: full-body fashion creator editorial`}
                fill
                sizes="(max-width: 620px) 86vw, (max-width: 980px) 44vw, 25vw"
              />
              <span className={styles.collectiveIndex}>0{index + 1}</span>
            </div>
            <div className={styles.collectiveLabel}>
              <Icon size={18} weight="bold" aria-hidden />
              <span><strong>{step}</strong><small>{note}</small></span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
