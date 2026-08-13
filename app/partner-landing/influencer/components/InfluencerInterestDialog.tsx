"use client";

import {
  ArrowRight,
  Article,
  CaretDown,
  Check,
  CheckCircle,
  GlobeHemisphereWest,
  InstagramLogo,
  MagnifyingGlass,
  PinterestLogo,
  Plus,
  ThreadsLogo,
  TiktokLogo,
  YoutubeLogo,
  X,
} from "@phosphor-icons/react";
import Link from "next/link";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { validateCreatorProfileUrl } from "../../services/creatorProfileValidation";
import type { CreatorPrimaryChannel } from "../../types";
import type { InfluencerLandingViewModel } from "../types";
import styles from "./influencerLanding.module.css";

type DialogPhase = "opening" | "open" | "closing";

type DropdownOption = {
  value: string;
  label: string;
  icon?: ReactNode;
};

type CreatorChannelOption = DropdownOption & {
  value: CreatorPrimaryChannel;
  placeholder: string;
};

type CreatorProfileCheck = {
  status: "checking" | "verified" | "unverified" | "invalid";
  message: string;
};

const CREATOR_CHANNEL_OPTIONS: CreatorChannelOption[] = [
  {
    value: "instagram",
    label: "Instagram",
    placeholder: "https://instagram.com/yourname",
    icon: (
      <InstagramLogo
        className={styles.brandInstagram}
        size={20}
        weight="fill"
      />
    ),
  },
  {
    value: "tiktok",
    label: "TikTok",
    placeholder: "https://tiktok.com/@yourname",
    icon: <TiktokLogo className={styles.brandTiktok} size={20} weight="fill" />,
  },
  {
    value: "threads",
    label: "Threads",
    placeholder: "https://threads.net/@yourname",
    icon: (
      <ThreadsLogo className={styles.brandThreads} size={20} weight="fill" />
    ),
  },
  {
    value: "youtube",
    label: "YouTube",
    placeholder: "https://youtube.com/@yourname",
    icon: (
      <YoutubeLogo className={styles.brandYoutube} size={20} weight="fill" />
    ),
  },
  {
    value: "pinterest",
    label: "Pinterest",
    placeholder: "https://pinterest.com/yourname",
    icon: (
      <PinterestLogo
        className={styles.brandPinterest}
        size={20}
        weight="fill"
      />
    ),
  },
  {
    value: "blog",
    label: "Blog or newsletter",
    placeholder: "https://yourwebsite.com",
    icon: <Article className={styles.brandBlog} size={20} weight="fill" />,
  },
  {
    value: "other",
    label: "Other",
    placeholder: "https://your-profile-link.com",
    icon: (
      <GlobeHemisphereWest
        className={styles.brandOther}
        size={20}
        weight="fill"
      />
    ),
  },
];

const CREATOR_AUDIENCE_OPTIONS: DropdownOption[] = [
  { value: "under-10k", label: "Under 10K" },
  { value: "10k-50k", label: "10K–50K" },
  { value: "50k-250k", label: "50K–250K" },
  { value: "250k-1m", label: "250K–1M" },
  { value: "1m-plus", label: "1M+" },
];

const COUNTRY_CODES =
  "AF AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW XK".split(
    " ",
  );

function countryFlag(code: string): string {
  return code.replace(/./g, (letter) =>
    String.fromCodePoint(127397 + letter.charCodeAt(0)),
  );
}

const COUNTRY_NAMES = new Intl.DisplayNames(["en"], { type: "region" });
const CREATOR_COUNTRY_OPTIONS: DropdownOption[] = COUNTRY_CODES.map((code) => ({
  value: COUNTRY_NAMES.of(code) ?? code,
  label: COUNTRY_NAMES.of(code) ?? code,
  icon: <span className={styles.dialogCountryFlag}>{countryFlag(code)}</span>,
}))
  .sort((left, right) => left.label.localeCompare(right.label))
  .concat({
    value: "Other / not listed",
    label: "Other / not listed",
    icon: <span className={styles.dialogCountryFlag}>🌍</span>,
  });

function CreatorPlatformLinks({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<
    CreatorPrimaryChannel[]
  >([]);
  const [activePlatform, setActivePlatform] =
    useState<CreatorPrimaryChannel | null>(null);
  const [links, setLinks] = useState<
    Partial<Record<CreatorPrimaryChannel, string>>
  >({});
  const [savedPlatforms, setSavedPlatforms] = useState<
    CreatorPrimaryChannel[]
  >([]);
  const [profileChecks, setProfileChecks] = useState<
    Partial<Record<CreatorPrimaryChannel, CreatorProfileCheck>>
  >({});
  const rootRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const activeOption = CREATOR_CHANNEL_OPTIONS.find(
    (option) => option.value === activePlatform,
  );
  const selectedOptions = selectedPlatforms
    .map((platform) =>
      CREATOR_CHANNEL_OPTIONS.find((option) => option.value === platform),
    )
    .filter((option): option is CreatorChannelOption => Boolean(option));
  const profiles = selectedPlatforms.map((platform) => ({
    platform,
    url: links[platform]?.trim() ?? "",
  }));
  const firstIncompletePlatform = profiles.find(
    (profile) =>
      !savedPlatforms.includes(profile.platform) ||
      !validateCreatorProfileUrl(profile.platform, profile.url).valid,
  )?.platform;
  const completedCount = profiles.filter(
    (profile) =>
      savedPlatforms.includes(profile.platform) &&
      validateCreatorProfileUrl(profile.platform, profile.url).valid,
  ).length;
  const isComplete = profiles.length > 0 && completedCount === profiles.length;

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onOpenChange(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen, onOpenChange]);

  const togglePlatform = (platform: CreatorPrimaryChannel) => {
    if (selectedPlatforms.includes(platform)) {
      const nextPlatforms = selectedPlatforms.filter(
        (value) => value !== platform,
      );
      setSelectedPlatforms(nextPlatforms);
      setLinks((current) => {
        const nextLinks = { ...current };
        delete nextLinks[platform];
        return nextLinks;
      });
      setSavedPlatforms((current) =>
        current.filter((value) => value !== platform),
      );
      setProfileChecks((current) => {
        const nextChecks = { ...current };
        delete nextChecks[platform];
        return nextChecks;
      });
      if (activePlatform === platform)
        setActivePlatform(nextPlatforms[0] ?? null);
      return;
    }

    setSelectedPlatforms((current) => [...current, platform]);
    setActivePlatform(platform);
  };

  const firstProfile = profiles.find((profile) =>
    savedPlatforms.includes(profile.platform) &&
    validateCreatorProfileUrl(profile.platform, profile.url).valid,
  );
  const activeProfileUrl = activePlatform ? links[activePlatform] ?? "" : "";
  const activeProfileIsSaved = Boolean(
    activePlatform &&
      savedPlatforms.includes(activePlatform) &&
      validateCreatorProfileUrl(activePlatform, activeProfileUrl).valid,
  );
  const activeProfileCheck = activePlatform
    ? profileChecks[activePlatform]
    : undefined;
  const activeProfileIsChecking = activeProfileCheck?.status === "checking";
  const activePlatformIndex = activePlatform
    ? selectedPlatforms.indexOf(activePlatform)
    : -1;
  const nextPlatformAfterSave =
    activePlatformIndex >= 0
      ? selectedPlatforms[activePlatformIndex + 1]
      : undefined;
  const nextPlatformOption = CREATOR_CHANNEL_OPTIONS.find(
    (option) => option.value === nextPlatformAfterSave,
  );

  const focusPlatformInput = (
    platform: CreatorPrimaryChannel,
    scrollIntoView = false,
  ) => {
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => {
        const input = rootRef.current?.querySelector<HTMLInputElement>(
          `[data-platform-link-input="${platform}"]`,
        );
        if (!input) return;

        if (scrollIntoView) {
          input.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches
              ? "auto"
              : "smooth",
            block: "center",
          });
        }
        input.focus({ preventScroll: true });
      }),
    );
  };

  const finishPlatformSelection = () => {
    const firstPlatform = selectedPlatforms[0];
    if (!firstPlatform) return;

    setActivePlatform(firstPlatform);
    onOpenChange(false);
    focusPlatformInput(firstPlatform, true);
  };

  const saveActiveProfile = async () => {
    if (!activePlatform) return;
    const platform = activePlatform;
    const validation = validateCreatorProfileUrl(
      platform,
      links[platform] ?? "",
    );

    if (!validation.valid) {
      setProfileChecks((current) => ({
        ...current,
        [platform]: { status: "invalid", message: validation.message },
      }));
      rootRef.current
        ?.querySelector<HTMLInputElement>(
          `[data-platform-link-input="${platform}"]`,
        )
        ?.focus();
      return;
    }

    const platformIndex = selectedPlatforms.indexOf(platform);
    const nextPlatform = selectedPlatforms[platformIndex + 1];
    setLinks((current) => ({
      ...current,
      [platform]: validation.normalizedUrl,
    }));
    setProfileChecks((current) => ({
      ...current,
      [platform]: {
        status: "checking",
        message: `Checking the public ${activeOption?.label ?? "profile"} page…`,
      },
    }));

    let completedCheck: CreatorProfileCheck;
    let normalizedUrl = validation.normalizedUrl;
    try {
      const response = await fetch("/api/creator-profiles/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ platform, url: validation.normalizedUrl }),
      });
      const result = (await response.json()) as {
        status?: CreatorProfileCheck["status"];
        normalizedUrl?: string;
        message?: string;
      };

      if (result.status === "invalid") {
        setProfileChecks((current) => ({
          ...current,
          [platform]: {
            status: "invalid",
            message: result.message ?? "This public profile could not be found.",
          },
        }));
        focusPlatformInput(platform);
        return;
      }
      if (!response.ok) throw new Error("Profile validation failed");

      normalizedUrl = result.normalizedUrl || validation.normalizedUrl;
      completedCheck = {
        status: result.status === "verified" ? "verified" : "unverified",
        message:
          result.message ??
          "Profile link saved. We’ll verify that the page is public during review.",
      };
    } catch {
      completedCheck = {
        status: "unverified",
        message:
          "Profile link saved. We couldn’t confirm automatically that it is public, so we’ll verify it during review.",
      };
    }

    setLinks((current) => ({ ...current, [platform]: normalizedUrl }));
    setSavedPlatforms((current) =>
      current.includes(platform) ? current : [...current, platform],
    );
    setProfileChecks((current) => ({
      ...current,
      [platform]: completedCheck,
    }));

    if (nextPlatform) {
      setActivePlatform(nextPlatform);
      focusPlatformInput(nextPlatform, true);
    }
  };

  return (
    <div
      className={styles.creatorProfileComposer}
      ref={rootRef}
      data-open={isOpen}
    >
      <input
        className={styles.dialogDropdownValue}
        name="primaryChannel"
        value={selectedPlatforms[0] ?? ""}
        onChange={() => undefined}
        tabIndex={-1}
        aria-hidden="true"
      />
      <input
        className={styles.dialogDropdownValue}
        name="website"
        value={firstProfile?.url ?? ""}
        onChange={() => undefined}
        tabIndex={-1}
        aria-hidden="true"
      />
      <input
        className={styles.dialogDropdownValue}
        name="creatorProfiles"
        value={JSON.stringify(profiles)}
        onChange={() => undefined}
        data-platform-profiles="true"
        data-complete={isComplete}
        data-missing-platform={firstIncompletePlatform ?? ""}
        tabIndex={-1}
        aria-label="Creator platform profile links"
      />

      <span className={styles.dialogFieldLabel} id={labelId}>
        Creator platforms &amp; profile links
      </span>
      <button
        type="button"
        className={styles.creatorPlatformTrigger}
        data-selected={selectedPlatforms.length > 0}
        data-platform-trigger="true"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={labelId}
        onClick={() => onOpenChange(!isOpen)}
      >
        <span className={styles.creatorPlatformTriggerCopy}>
          <span
            className={styles.creatorPlatformIconStack}
            data-empty={selectedOptions.length === 0}
            aria-hidden
          >
            {(selectedOptions.length > 0
              ? selectedOptions.slice(0, 3)
              : CREATOR_CHANNEL_OPTIONS.slice(0, 3)
            ).map((option) => (
              <span key={option.value}>{option.icon}</span>
            ))}
          </span>
          <span>
            <strong>
              {selectedPlatforms.length > 0
                ? `${selectedPlatforms.length} platform${selectedPlatforms.length === 1 ? "" : "s"} selected`
                : "Select your platforms"}
            </strong>
            <small>
              {selectedPlatforms.length > 0
                ? `${completedCount} of ${selectedPlatforms.length} profile links added`
                : "Choose every place where you create"}
            </small>
          </span>
        </span>
        <CaretDown size={17} weight="bold" />
      </button>

      <div
        className={`${styles.dialogDropdownPanel} ${styles.creatorPlatformPanel}`}
        data-open={isOpen}
      >
        <div className={styles.dialogDropdownSurface}>
          <div className={styles.creatorPlatformPickerHeading}>
            <span>Select multiple platforms</span>
            <small>{selectedPlatforms.length} selected</small>
          </div>
          <div
            className={styles.creatorPlatformPicker}
            role="listbox"
            aria-multiselectable="true"
            aria-labelledby={labelId}
          >
            {CREATOR_CHANNEL_OPTIONS.map((option) => {
              const isSelected = selectedPlatforms.includes(option.value);
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={styles.creatorPlatformOption}
                  key={option.value}
                  onClick={() => togglePlatform(option.value)}
                >
                  <span>
                    {option.icon}
                    <strong>{option.label}</strong>
                  </span>
                  <span className={styles.creatorPlatformCheck}>
                    {isSelected ? (
                      <Check size={14} weight="bold" />
                    ) : (
                      <Plus size={14} weight="bold" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className={styles.creatorPlatformDone}
            onClick={finishPlatformSelection}
            disabled={selectedPlatforms.length === 0}
          >
            Done · add profile links
          </button>
        </div>
      </div>

      {selectedOptions.length > 0 ? (
        <div className={styles.creatorProfileWorkspace}>
          <p className={styles.creatorPlatformHint}>
            Choose a platform, paste its URL, then select Save &amp; next.
          </p>
          <div
            className={styles.creatorPlatformTabs}
            aria-label="Selected creator platforms"
          >
            {selectedOptions.map((option) => {
              const hasLink =
                savedPlatforms.includes(option.value) &&
                validateCreatorProfileUrl(
                  option.value,
                  links[option.value] ?? "",
                ).valid;
              return (
                <button
                  type="button"
                  key={option.value}
                  data-active={option.value === activePlatform}
                  data-complete={hasLink}
                  data-platform-tab={option.value}
                  onClick={() => setActivePlatform(option.value)}
                  aria-label={`Edit ${option.label} profile link`}
                >
                  {option.icon}
                  <span>{option.label}</span>
                  {hasLink ? <Check size={12} weight="bold" /> : <i />}
                </button>
              );
            })}
            <button
              type="button"
              className={styles.creatorPlatformAdd}
              onClick={() => onOpenChange(true)}
              aria-label="Add another platform"
            >
              <Plus size={15} weight="bold" />
            </button>
          </div>

          {activeOption ? (
            <div className={styles.creatorProfileLinkEditor}>
              <span>{activeOption.icon}</span>
              <span>
                <label htmlFor={`${labelId}-${activeOption.value}`}>
                  {activeOption.label} profile URL
                </label>
                <input
                  id={`${labelId}-${activeOption.value}`}
                  type="url"
                  value={links[activeOption.value] ?? ""}
                  onChange={(event) => {
                    setLinks((current) => ({
                      ...current,
                      [activeOption.value]: event.target.value,
                    }));
                    setSavedPlatforms((current) =>
                      current.filter((value) => value !== activeOption.value),
                    );
                    setProfileChecks((current) => {
                      const nextChecks = { ...current };
                      delete nextChecks[activeOption.value];
                      return nextChecks;
                    });
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    void saveActiveProfile();
                  }}
                  placeholder={activeOption.placeholder}
                  data-platform-link-input={activeOption.value}
                  required
                  aria-label={`${activeOption.label} profile URL`}
                  aria-invalid={activeProfileCheck?.status === "invalid"}
                  aria-describedby={`${labelId}-${activeOption.value}-status`}
                />
              </span>
              <button
                type="button"
                className={styles.creatorProfileSaveButton}
                data-saved={activeProfileIsSaved}
                data-checking={activeProfileIsChecking}
                data-platform-save-button={activeOption.value}
                onClick={() => void saveActiveProfile()}
                disabled={activeProfileIsSaved || activeProfileIsChecking}
              >
                {activeProfileIsChecking ? (
                  <>Checking…</>
                ) : activeProfileIsSaved ? (
                  <>
                    <Check size={14} weight="bold" />
                    Saved
                  </>
                ) : nextPlatformAfterSave ? (
                  <>
                    Save &amp; next
                    <ArrowRight size={14} weight="bold" />
                  </>
                ) : (
                  <>
                    Save profile
                    <Check size={14} weight="bold" />
                  </>
                )}
              </button>
            </div>
          ) : null}
          {activeOption ? (
            <p
              className={styles.creatorProfileLinkStatus}
              data-state={
                activeProfileCheck?.status === "invalid"
                  ? "error"
                  : activeProfileCheck?.status ??
                    (activeProfileIsSaved ? "saved" : "idle")
              }
              id={`${labelId}-${activeOption.value}-status`}
              role={
                activeProfileCheck?.status === "invalid" ? "alert" : "status"
              }
            >
              {activeProfileCheck?.message ??
                (activeProfileIsSaved
                  ? `${activeOption.label} saved.`
                  : nextPlatformOption
                    ? `Save this link to continue to ${nextPlatformOption.label}.`
                    : "Save this link to finish your platform profiles.")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AnimatedDropdown({
  name,
  label,
  placeholder,
  options,
  searchable = false,
  isOpen,
  onOpenChange,
  className,
}: {
  name: string;
  label: string;
  placeholder: string;
  options: DropdownOption[];
  searchable?: boolean;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [selectedValue, setSelectedValue] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const selectedOption = options.find(
    (option) => option.value === selectedValue,
  );
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return normalizedQuery
      ? options.filter((option) =>
          option.label.toLowerCase().includes(normalizedQuery),
        )
      : options;
  }, [options, query]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onOpenChange(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    if (searchable)
      window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen, onOpenChange, searchable]);

  return (
    <div
      className={[styles.dialogDropdown, className].filter(Boolean).join(" ")}
      ref={rootRef}
      data-open={isOpen}
    >
      <input
        className={styles.dialogDropdownValue}
        name={name}
        value={selectedValue}
        onChange={() => undefined}
        data-dropdown-value="true"
        required
        tabIndex={-1}
        aria-label={label}
      />
      <span className={styles.dialogFieldLabel} id={labelId}>
        {label}
      </span>
      <button
        type="button"
        className={styles.dialogDropdownTrigger}
        data-selected={Boolean(selectedOption)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={labelId}
        data-dropdown-trigger={name}
        onClick={() => onOpenChange(!isOpen)}
      >
        <span>
          {selectedOption?.icon}
          <strong>{selectedOption?.label ?? placeholder}</strong>
        </span>
        <CaretDown size={17} weight="bold" />
      </button>
      <div className={styles.dialogDropdownPanel} data-open={isOpen}>
        <div className={styles.dialogDropdownPanelInner}>
          <div className={styles.dialogDropdownSurface}>
            {searchable ? (
              <label className={styles.dialogDropdownSearch}>
                <MagnifyingGlass size={17} />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search countries"
                />
              </label>
            ) : null}
            <div
              className={styles.dialogDropdownOptions}
              role="listbox"
              aria-labelledby={labelId}
            >
              {filteredOptions.map((option) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === selectedValue}
                  className={styles.dialogDropdownOption}
                  key={option.value}
                  onClick={() => {
                    setSelectedValue(option.value);
                    setQuery("");
                    onOpenChange(false);
                  }}
                >
                  <span>
                    {option.icon}
                    <strong>{option.label}</strong>
                  </span>
                  {option.value === selectedValue ? (
                    <Check size={17} weight="bold" />
                  ) : null}
                </button>
              ))}
              {filteredOptions.length === 0 ? (
                <p className={styles.dialogDropdownEmpty}>No country found.</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function InfluencerInterestDialog({
  viewModel,
  isOpen,
  message,
  submissionState,
  onClose,
  onSubmit,
}: {
  viewModel: InfluencerLandingViewModel;
  isOpen: boolean;
  message: string;
  submissionState: "idle" | "submitting" | "success" | "error";
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [phase, setPhase] = useState<DialogPhase>("opening");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    let phaseTimeout: number | undefined;

    const phaseFrame = window.requestAnimationFrame(() => {
      if (isOpen) {
        setIsMounted(true);
        setPhase("opening");
        phaseTimeout = window.setTimeout(() => setPhase("open"), 700);
      } else {
        setPhase("closing");
        phaseTimeout = window.setTimeout(() => setIsMounted(false), 700);
      }
    });

    return () => {
      if (phaseFrame) window.cancelAnimationFrame(phaseFrame);
      if (phaseTimeout) window.clearTimeout(phaseTimeout);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isMounted) return;
    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    };
  }, [isMounted]);

  if (!isMounted) return null;
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;

    for (const element of Array.from(form.elements)) {
      if (!(element instanceof HTMLInputElement)) continue;

      if (element.dataset.platformProfiles === "true") {
        if (element.value === "[]") {
          setOpenDropdown("creatorPlatforms");
          window.requestAnimationFrame(() =>
            form
              .querySelector<HTMLButtonElement>("[data-platform-trigger]")
              ?.focus(),
          );
          return;
        }

        if (element.dataset.complete !== "true") {
          const missingPlatform = element.dataset.missingPlatform;
          setOpenDropdown(null);
          window.requestAnimationFrame(() => {
            form
              .querySelector<HTMLButtonElement>(
                `[data-platform-tab="${missingPlatform}"]`,
              )
              ?.click();
            window.requestAnimationFrame(() => {
              const linkInput = form.querySelector<HTMLInputElement>(
                `[data-platform-link-input="${missingPlatform}"]`,
              );
              linkInput?.focus();
              form
                .querySelector<HTMLButtonElement>(
                  `[data-platform-save-button="${missingPlatform}"]`,
                )
                ?.click();
            });
          });
          return;
        }
        continue;
      }

      if (element.dataset.dropdownValue === "true") {
        if (!element.value) {
          setOpenDropdown(element.name);
          window.requestAnimationFrame(() =>
            form
              .querySelector<HTMLButtonElement>(
                `[data-dropdown-trigger="${element.name}"]`,
              )
              ?.focus(),
          );
          return;
        }
        continue;
      }

      if (!element.checkValidity()) {
        element.reportValidity();
        element.focus();
        return;
      }
    }

    const formData = new FormData(form);
    formData.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
    void onSubmit(formData);
  };
  return (
    <div className={styles.dialogBackdrop} data-state={phase}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="influencer-interest-title"
      >
        <button
          type="button"
          className={styles.dialogClose}
          onClick={() => {
            setOpenDropdown(null);
            onClose();
          }}
          aria-label="Close form"
        >
          <X size={20} />
        </button>
        <span>Creator waitlist</span>
        <h2 id="influencer-interest-title">{viewModel.interest.title}</h2>
        <p>{viewModel.interest.body}</p>
        {submissionState === "success" ? (
          <div className={styles.dialogSuccess}>
            <CheckCircle size={36} weight="fill" />
            <strong>{message}</strong>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <label>
              Name
              <input
                name="name"
                autoComplete="name"
                required
                placeholder="Your name"
                autoFocus
              />
            </label>
            <label>
              Email
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@email.com"
              />
            </label>
            <CreatorPlatformLinks
              isOpen={openDropdown === "creatorPlatforms"}
              onOpenChange={(nextOpen) =>
                setOpenDropdown(nextOpen ? "creatorPlatforms" : null)
              }
            />
            <div className={styles.dialogFieldRow}>
              <AnimatedDropdown
                name="audienceSize"
                label="Audience size"
                placeholder="Choose a range"
                options={CREATOR_AUDIENCE_OPTIONS}
                isOpen={openDropdown === "audienceSize"}
                onOpenChange={(nextOpen) =>
                  setOpenDropdown(nextOpen ? "audienceSize" : null)
                }
              />
              <AnimatedDropdown
                name="location"
                label="Country or region"
                placeholder="Choose your country"
                options={CREATOR_COUNTRY_OPTIONS}
                searchable
                isOpen={openDropdown === "location"}
                onOpenChange={(nextOpen) =>
                  setOpenDropdown(nextOpen ? "location" : null)
                }
                className={styles.dialogCountryDropdown}
              />
            </div>
            <label className={styles.dialogConsent}>
              <input name="marketingConsent" type="checkbox" required />
              <span>
                I agree to receive creator-program updates from PrimeStyleAI and
                accept the{" "}
                <Link
                  href="/privacy-policy"
                  target="_blank"
                  rel="noreferrer"
                >
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  rel="noreferrer"
                >
                  Terms
                </Link>
                . I can opt out at any time.
              </span>
            </label>
            <p className={styles.dialogPrivacyNote}>
              Creator applications stay separate from merchant outreach.
            </p>
            {message ? (
              <p className={styles.formMessage} data-state={submissionState}>
                {message}
              </p>
            ) : null}
            <button type="submit" disabled={submissionState === "submitting"}>
              {submissionState === "submitting" ? "Joining…" : "Join waitlist"}
              <ArrowRight size={17} />
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
