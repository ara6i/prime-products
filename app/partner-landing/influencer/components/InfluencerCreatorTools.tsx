import { ArrowDownRight, ArrowRight, CheckCircle, InstagramLogo, TiktokLogo } from "@phosphor-icons/react";
import type { InfluencerLandingViewModel } from "../types";
import { PartnerIcon } from "../../components/PartnerIcon";
import styles from "./influencerLanding.module.css";

export function InfluencerCreatorTools({ viewModel }: { viewModel: InfluencerLandingViewModel }) {
  return (
    <>
      <section id="creator-tools" className={styles.creatorTools} aria-labelledby="creator-tools-title">
        <div className={styles.toolsIntro}>
          <p className={styles.eyebrow}>Your creator toolkit</p>
          <h2 id="creator-tools-title">Everything between <em>inspiration and checkout.</em></h2>
          <p>Each tool is designed around the real publisher workflow in the PrimeStyleAI merchant-channel manual.</p>
        </div>
        <div className={styles.toolsGrid}>
          {viewModel.features.map((feature) => (
            <article key={feature.number}>
              <div className={styles.toolNumber}><span>{feature.number}</span><i aria-hidden /><PartnerIcon name={feature.icon} /></div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <small>{feature.note}</small>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.creatorFilmStory} aria-labelledby="creator-film-title">
        <div className={styles.filmStoryCopy}>
          <span>One look. One continuous journey.</span>
          <h2 id="creator-film-title">Your content stays <em>connected.</em></h2>
          <p>From the first tap to the merchant cart, the creator, campaign, merchant, and product travel together.</p>
          <div className={styles.socialMarks}><InstagramLogo size={23} weight="fill" /><TiktokLogo size={23} weight="fill" /><ArrowRight size={28} /></div>
        </div>
        <div className={styles.creatorFilmRail}>
          {["CREATE", "SHARE", "CHOOSE", "CART"].map((label, index) => (
            <div key={label}>
              <video src={index % 2 === 0 ? viewModel.hero.video : "/media/partner-landing/creator-portrait.mp4"} poster={index % 2 === 0 ? viewModel.hero.poster : "/media/partner-landing/creator-portrait-poster.jpg"} autoPlay muted loop playsInline />
              <span>0{index + 1} · {label}</span>
              {index === 3 ? <strong><CheckCircle size={17} weight="fill" /> Exact choice</strong> : null}
            </div>
          ))}
        </div>
        <div className={styles.filmAnnotation}>No lost handoff <ArrowDownRight size={36} /></div>
      </section>
    </>
  );
}
