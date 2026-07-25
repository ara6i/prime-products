"use client";

import { useState } from "react";

export interface PreferenceToggleState {
  autoRegenerate: boolean;
  privateDesigns: boolean;
  spaceTemplatesOnly: boolean;
  blockExports: boolean;
  keepFilename: boolean;
}

export function usePreferencesWorkspaceUi() {
  const [activeSection, setActiveSection] = useState("account-profile");
  const [displayName, setDisplayName] = useState("PrimeStyleAI");
  const [language, setLanguage] = useState("English");
  const [appearance, setAppearance] = useState("System");
  const [spaceName, setSpaceName] = useState("Primestyleai’s Space");
  const [spaceDescription, setSpaceDescription] = useState("Private product imagery workspace.");
  const [exportFormat, setExportFormat] = useState("Best for image");
  const [savedSection, setSavedSection] = useState("");
  const [toggles, setToggles] = useState<PreferenceToggleState>({
    autoRegenerate: false,
    privateDesigns: false,
    spaceTemplatesOnly: false,
    blockExports: false,
    keepFilename: true,
  });

  function toggle(key: keyof PreferenceToggleState): void {
    setToggles((current) => ({ ...current, [key]: !current[key] }));
    setSavedSection("");
  }

  function save(section: string): void {
    setSavedSection(section);
  }

  return {
    activeSection,
    displayName,
    language,
    appearance,
    spaceName,
    spaceDescription,
    exportFormat,
    savedSection,
    toggles,
    setActiveSection,
    setDisplayName,
    setLanguage,
    setAppearance,
    setSpaceName,
    setSpaceDescription,
    setExportFormat,
    toggle,
    save,
  };
}
