"use client";

import {
  ArrowRight,
  CaretDown,
  Check,
  CheckCircle,
  CircleNotch,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  SHIPPING_COUNTRY_COUNT,
  SHIPPING_COUNTRY_GROUPS,
  shippingCountryFlag,
  shippingCountryName,
} from "../data/supplierShippingCountries";
import styles from "./supplierLanding.module.css";

type DialogPhase = "opening" | "open" | "closing";
type SubmissionState = "idle" | "submitting" | "success" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WEBSITE_RE = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/i;

const CONNECTION_GOALS = [
  { value: "merchant-connections", label: "Connect with merchants" },
  { value: "influencer-partnerships", label: "Work with influencers" },
  { value: "global-distribution", label: "Expand global distribution" },
  { value: "operations-dashboard", label: "Manage everything in one dashboard" },
] as const;

type SupplierDropdownOption = {
  value: string;
  label: string;
};

const PRODUCT_CATEGORY_OPTIONS = [
  { value: "apparel", label: "Apparel" },
  { value: "footwear", label: "Footwear" },
  { value: "accessories", label: "Accessories and jewelry" },
  { value: "beauty", label: "Beauty and personal care" },
  { value: "mixed", label: "Multiple categories" },
  { value: "other", label: "Other" },
] as const;

const CATALOG_SIZE_OPTIONS = [
  { value: "under-100", label: "Under 100 products" },
  { value: "100-500", label: "100–500 products" },
  { value: "500-2500", label: "500–2,500 products" },
  { value: "2500-plus", label: "2,500+ products" },
] as const;

const SELLING_MODEL_OPTIONS = [
  { value: "wholesale", label: "Wholesale" },
  { value: "dropship", label: "Dropship" },
  { value: "direct", label: "Direct to consumer" },
  { value: "flexible", label: "A flexible mix" },
] as const;

const SHIPPING_COUNTRY_OPTIONS = SHIPPING_COUNTRY_GROUPS.map((group) => ({
  ...group,
  countries: group.countryCodes
    .map((code) => ({ code, name: shippingCountryName(code) }))
    .sort((left, right) => left.name.localeCompare(right.name, "en")),
}));

const ALL_SHIPPING_COUNTRY_CODES = SHIPPING_COUNTRY_GROUPS.flatMap(
  (group) => group.countryCodes,
);

function SupplierDropdown({
  name,
  label,
  placeholder,
  options,
  isOpen,
  onOpenChange,
  onValueChange,
}: {
  name: string;
  label: string;
  placeholder: string;
  options: ReadonlyArray<SupplierDropdownOption>;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onValueChange: () => void;
}) {
  const [selectedValue, setSelectedValue] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const selectedOption = options.find(
    (option) => option.value === selectedValue,
  );

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

  return (
    <div
      className={styles.supplierDialogDropdown}
      ref={rootRef}
      data-open={isOpen}
    >
      <input
        className={styles.supplierDialogDropdownValue}
        name={name}
        value={selectedValue}
        onChange={() => undefined}
        data-dropdown-value="true"
        required
        tabIndex={-1}
        aria-label={label}
      />
      <span className={styles.supplierDialogFieldLabel} id={labelId}>
        {label}
      </span>
      <button
        type="button"
        className={styles.supplierDialogDropdownTrigger}
        data-selected={Boolean(selectedOption)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={labelId}
        data-dropdown-trigger={name}
        onClick={() => onOpenChange(!isOpen)}
      >
        <strong>{selectedOption?.label ?? placeholder}</strong>
        <CaretDown size={17} weight="bold" />
      </button>
      <div className={styles.supplierDialogDropdownPanel} data-open={isOpen}>
        <div className={styles.supplierDialogDropdownSurface}>
          <div
            className={styles.supplierDialogDropdownOptions}
            role="listbox"
            aria-labelledby={labelId}
          >
            {options.map((option) => (
              <button
                type="button"
                role="option"
                aria-selected={option.value === selectedValue}
                className={styles.supplierDialogDropdownOption}
                key={option.value}
                onClick={() => {
                  setSelectedValue(option.value);
                  onValueChange();
                  onOpenChange(false);
                }}
              >
                <strong>{option.label}</strong>
                {option.value === selectedValue ? (
                  <Check size={17} weight="bold" />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ShippingCountriesDropdown({
  name,
  label,
  placeholder,
  isOpen,
  onOpenChange,
  onValueChange,
}: {
  name: string;
  label: string;
  placeholder: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onValueChange: () => void;
}) {
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [expandedContinents, setExpandedContinents] = useState<Set<string>>(
    () => new Set(SHIPPING_COUNTRY_GROUPS.map((group) => group.id)),
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const panelId = useId();
  const selectedSet = useMemo(() => new Set(selectedCodes), [selectedCodes]);
  const normalizedQuery = query.trim().toLocaleLowerCase("en");
  const visibleGroups = useMemo(
    () =>
      SHIPPING_COUNTRY_OPTIONS.map((group) => ({
        ...group,
        countries: normalizedQuery
          ? group.countries.filter((country) =>
              country.name.toLocaleLowerCase("en").includes(normalizedQuery),
            )
          : group.countries,
      })).filter((group) => group.countries.length > 0),
    [normalizedQuery],
  );
  const selectedContinentCount = SHIPPING_COUNTRY_GROUPS.filter((group) =>
    group.countryCodes.some((code) => selectedSet.has(code)),
  ).length;
  const selectionLabel =
    selectedCodes.length === 0
      ? placeholder
      : selectedCodes.length === SHIPPING_COUNTRY_COUNT
        ? `All ${SHIPPING_COUNTRY_COUNT} countries and territories`
        : selectedCodes.length === 1
          ? shippingCountryName(selectedCodes[0])
          : `${selectedCodes.length} countries and territories selected`;

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
    window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen, onOpenChange]);

  const updateSelectedCodes = (nextCodes: string[]) => {
    setSelectedCodes(nextCodes);
    onValueChange();
  };

  const toggleCountry = (code: string) => {
    updateSelectedCodes(
      selectedSet.has(code)
        ? selectedCodes.filter((selectedCode) => selectedCode !== code)
        : [...selectedCodes, code],
    );
  };

  const toggleContinent = (countryCodes: readonly string[]) => {
    const allSelected = countryCodes.every((code) => selectedSet.has(code));
    const continentCodeSet = new Set(countryCodes);
    updateSelectedCodes(
      allSelected
        ? selectedCodes.filter((code) => !continentCodeSet.has(code))
        : Array.from(new Set([...selectedCodes, ...countryCodes])),
    );
  };

  const toggleContinentPanel = (continentId: string) => {
    setExpandedContinents((currentContinents) => {
      const nextContinents = new Set(currentContinents);
      if (nextContinents.has(continentId)) {
        nextContinents.delete(continentId);
      } else {
        nextContinents.add(continentId);
      }
      return nextContinents;
    });
  };

  return (
    <div
      className={`${styles.supplierDialogDropdown} ${styles.supplierShippingDropdown}`}
      ref={rootRef}
      data-open={isOpen}
    >
      <input
        className={styles.supplierDialogDropdownValue}
        name={name}
        value={selectedCodes.join(",")}
        readOnly
        data-dropdown-value="true"
        required
        tabIndex={-1}
        aria-label={label}
      />
      <span className={styles.supplierDialogFieldLabel} id={labelId}>
        {label}
      </span>
      <button
        type="button"
        className={styles.supplierDialogDropdownTrigger}
        data-selected={selectedCodes.length > 0}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-labelledby={labelId}
        data-dropdown-trigger={name}
        onClick={() => onOpenChange(!isOpen)}
      >
        <span className={styles.supplierShippingTriggerCopy}>
          <strong>{selectionLabel}</strong>
          {selectedCodes.length > 0 ? (
            <small>
              {selectedContinentCount} continent
              {selectedContinentCount === 1 ? "" : "s"}
            </small>
          ) : null}
        </span>
        <CaretDown size={17} weight="bold" />
      </button>
      <div
        className={`${styles.supplierDialogDropdownPanel} ${styles.supplierShippingDropdownPanel}`}
        data-open={isOpen}
        id={panelId}
      >
        <div className={styles.supplierDialogDropdownSurface}>
          <label className={styles.supplierShippingSearch}>
            <MagnifyingGlass size={17} weight="bold" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search countries"
              aria-label="Search shipping countries"
            />
          </label>
          <div className={styles.supplierShippingToolbar}>
            <span>
              {selectedCodes.length} of {SHIPPING_COUNTRY_COUNT} selected
            </span>
            <button
              type="button"
              onClick={() =>
                updateSelectedCodes(
                  selectedCodes.length === SHIPPING_COUNTRY_COUNT
                    ? []
                    : [...ALL_SHIPPING_COUNTRY_CODES],
                )
              }
            >
              {selectedCodes.length === SHIPPING_COUNTRY_COUNT
                ? "Clear all"
                : "Select all countries"}
            </button>
          </div>
          <div
            className={styles.supplierShippingContinents}
            role="listbox"
            aria-multiselectable="true"
            aria-labelledby={labelId}
          >
            {visibleGroups.map((group) => {
              const groupSelectedCount = group.countryCodes.filter((code) =>
                selectedSet.has(code),
              ).length;
              const groupIsSelected =
                groupSelectedCount === group.countryCodes.length;
              const groupIsExpanded = Boolean(normalizedQuery) ||
                expandedContinents.has(group.id);
              const groupPanelId = `${panelId}-${group.id}`;
              const groupToggleId = `${groupPanelId}-toggle`;

              return (
                <section
                  className={styles.supplierShippingContinent}
                  role="group"
                  aria-labelledby={groupToggleId}
                  key={group.id}
                >
                  <header>
                    <button
                      type="button"
                      className={styles.supplierShippingContinentToggle}
                      id={groupToggleId}
                      aria-expanded={groupIsExpanded}
                      aria-controls={groupPanelId}
                      onClick={() => toggleContinentPanel(group.id)}
                    >
                      <span>
                        <strong>{group.label}</strong>
                        <small>
                          {groupSelectedCount}/{group.countryCodes.length}
                        </small>
                      </span>
                      <CaretDown
                        size={17}
                        weight="bold"
                        aria-hidden="true"
                      />
                    </button>
                    <button
                      type="button"
                      className={styles.supplierShippingContinentSelectAll}
                      onClick={() => toggleContinent(group.countryCodes)}
                    >
                      {groupIsSelected ? "Deselect all" : "Select all"}
                    </button>
                  </header>
                  {groupIsExpanded ? (
                    <div
                      className={styles.supplierShippingCountryGrid}
                      id={groupPanelId}
                      role="region"
                      aria-labelledby={groupToggleId}
                    >
                      {group.countries.map((country) => {
                        const isSelected = selectedSet.has(country.code);
                        return (
                          <button
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            className={styles.supplierShippingCountry}
                            key={country.code}
                            onClick={() => toggleCountry(country.code)}
                          >
                            <span className={styles.supplierShippingCountryName}>
                              <span aria-hidden="true">
                                {shippingCountryFlag(country.code)}
                              </span>
                              <strong>{country.name}</strong>
                            </span>
                            <span
                              className={styles.supplierShippingCountryCheck}
                              data-selected={isSelected}
                              aria-hidden="true"
                            >
                              {isSelected ? (
                                <Check size={13} weight="bold" />
                              ) : null}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </section>
              );
            })}
            {visibleGroups.length === 0 ? (
              <p className={styles.supplierShippingEmpty}>
                No country matches “{query}”.
              </p>
            ) : null}
          </div>
          <div className={styles.supplierShippingFooter}>
            <span>{selectedCodes.length} selected</span>
            <button type="button" onClick={() => onOpenChange(false)}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SupplierInterestDialog({
  isOpen,
  message,
  submissionState,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  message: string;
  submissionState: SubmissionState;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [phase, setPhase] = useState<DialogPhase>("opening");
  const [localMessage, setLocalMessage] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let phaseTimeout: number | undefined;
    const phaseFrame = window.requestAnimationFrame(() => {
      if (isOpen) {
        setIsMounted(true);
        setPhase("opening");
        setLocalMessage("");
        setOpenDropdown(null);
        phaseTimeout = window.setTimeout(() => setPhase("open"), 700);
      } else {
        setPhase("closing");
        phaseTimeout = window.setTimeout(() => setIsMounted(false), 700);
      }
    });

    return () => {
      window.cancelAnimationFrame(phaseFrame);
      if (phaseTimeout) window.clearTimeout(phaseTimeout);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isMounted || !isOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    const focusFrame = window.requestAnimationFrame(() =>
      nameInputRef.current?.focus(),
    );
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMounted, isOpen, onClose]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const companyName = String(formData.get("companyName") ?? "").trim();
    const website = String(formData.get("website") ?? "").trim();
    const requiredSelect = [
      "productCategory",
      "catalogSize",
      "sellingModel",
      "shippingReach",
    ].find((field) => !String(formData.get(field) ?? "").trim());
    const connectionGoals = formData.getAll("connectionGoals");

    const invalidField =
      name.length < 2
        ? "name"
        : !EMAIL_RE.test(email)
          ? "email"
          : companyName.length < 2
            ? "companyName"
            : !WEBSITE_RE.test(website)
              ? "website"
              : requiredSelect;

    if (invalidField || connectionGoals.length === 0) {
      setLocalMessage(
        invalidField === "email"
          ? "Add a valid work email."
          : invalidField === "website"
            ? "Add a valid catalog or company website."
            : invalidField === "name"
              ? "Add your full name."
              : invalidField === "companyName"
                ? "Add your company name."
                : requiredSelect
                  ? "Complete each supplier profile question."
                  : "Choose at least one connection goal.",
      );
      if (invalidField) {
        const dropdownTrigger = form.querySelector<HTMLButtonElement>(
          `[data-dropdown-trigger="${invalidField}"]`,
        );
        if (dropdownTrigger) {
          setOpenDropdown(invalidField);
          window.requestAnimationFrame(() => dropdownTrigger.focus());
        } else {
          form
            .querySelector<HTMLInputElement>(`[name="${invalidField}"]`)
            ?.focus();
        }
      } else {
        form
          .querySelector<HTMLInputElement>("[name=\"connectionGoals\"]")
          ?.focus();
      }
      return;
    }

    setLocalMessage("");
    void onSubmit(formData);
  };

  if (!isMounted) return null;

  return (
    <div
      className={styles.supplierDialogBackdrop}
      data-state={phase}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        className={styles.supplierDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="supplier-interest-title"
      >
        <button
          type="button"
          className={styles.supplierDialogClose}
          onClick={onClose}
          aria-label="Close supplier waitlist form"
        >
          <X size={20} />
        </button>

        <div className={styles.supplierDialogIntro}>
          <span>PrimeStyleAI supplier network</span>
          <h2 id="supplier-interest-title">Let’s find your best path to growth.</h2>
          <p>
            Tell us about your catalog, reach, and the partners you want to meet.
            We’ll use your answers to prepare the right network introduction.
          </p>
        </div>

        {submissionState === "success" ? (
          <div className={styles.supplierDialogSuccess}>
            <CheckCircle size={42} weight="fill" />
            <strong>{message}</strong>
            <button type="button" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form
            className={styles.supplierDialogForm}
            onChange={() => setLocalMessage("")}
            onSubmit={handleSubmit}
            noValidate
          >
            <div className={styles.supplierDialogGrid}>
              <label>
                <span>Full name *</span>
                <input
                  ref={nameInputRef}
                  name="name"
                  autoComplete="name"
                  placeholder="Jane Cooper"
                  required
                />
              </label>
              <label>
                <span>Work email *</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="jane@company.com"
                  required
                />
              </label>
              <label>
                <span>Company name *</span>
                <input
                  name="companyName"
                  autoComplete="organization"
                  placeholder="Your company"
                  required
                />
              </label>
              <label>
                <span>Catalog or company website *</span>
                <input
                  name="website"
                  type="url"
                  autoComplete="url"
                  inputMode="url"
                  placeholder="https://yourcompany.com"
                  required
                />
              </label>
              <SupplierDropdown
                name="productCategory"
                label="What products do you supply? *"
                placeholder="Select category"
                options={PRODUCT_CATEGORY_OPTIONS}
                isOpen={openDropdown === "productCategory"}
                onOpenChange={(nextOpen) =>
                  setOpenDropdown(nextOpen ? "productCategory" : null)
                }
                onValueChange={() => setLocalMessage("")}
              />
              <SupplierDropdown
                name="catalogSize"
                label="How large is your active catalog? *"
                placeholder="Select catalog size"
                options={CATALOG_SIZE_OPTIONS}
                isOpen={openDropdown === "catalogSize"}
                onOpenChange={(nextOpen) =>
                  setOpenDropdown(nextOpen ? "catalogSize" : null)
                }
                onValueChange={() => setLocalMessage("")}
              />
              <SupplierDropdown
                name="sellingModel"
                label="How do you want to sell? *"
                placeholder="Select selling model"
                options={SELLING_MODEL_OPTIONS}
                isOpen={openDropdown === "sellingModel"}
                onOpenChange={(nextOpen) =>
                  setOpenDropdown(nextOpen ? "sellingModel" : null)
                }
                onValueChange={() => setLocalMessage("")}
              />
              <ShippingCountriesDropdown
                name="shippingReach"
                label="Where do you ship? *"
                placeholder="Select countries"
                isOpen={openDropdown === "shippingReach"}
                onOpenChange={(nextOpen) =>
                  setOpenDropdown(nextOpen ? "shippingReach" : null)
                }
                onValueChange={() => setLocalMessage("")}
              />
            </div>

            <fieldset className={styles.supplierDialogGoals}>
              <legend>What do you want PrimeStyleAI to help with? *</legend>
              <div>
                {CONNECTION_GOALS.map((goal) => (
                  <label key={goal.value}>
                    <input
                      type="checkbox"
                      name="connectionGoals"
                      value={goal.value}
                    />
                    <span aria-hidden="true" />
                    {goal.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className={styles.supplierDialogNotes}>
              <span>Anything else we should know?</span>
              <textarea
                name="notes"
                rows={3}
                placeholder="Tell us about your ideal merchants, creator campaigns, or operational needs."
              />
            </label>

            {localMessage || message ? (
              <p className={styles.supplierDialogMessage} role="alert">
                {localMessage || message}
              </p>
            ) : null}

            <div className={styles.supplierDialogSubmitRow}>
              <p>Your information stays private and is only used to review your request.</p>
              <button type="submit" disabled={submissionState === "submitting"}>
                {submissionState === "submitting" ? (
                  <>
                    <CircleNotch className={styles.supplierDialogSpinner} size={17} />
                    Joining…
                  </>
                ) : (
                  <>
                    Join waitlist <ArrowRight size={17} weight="bold" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
