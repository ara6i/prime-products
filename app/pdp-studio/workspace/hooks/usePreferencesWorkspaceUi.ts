"use client";

import { useEffect, useState } from "react";
import { uploadPdpStudioAsset } from "../../platform/services/pdpStudioAssetService";
import {
  getPdpStudioProfile,
  updatePdpStudioProfile,
} from "../../platform/services/pdpStudioProfileService";
import type { PdpStudioAsset } from "../../platform/types/pdpStudioPlatform";

export function usePreferencesWorkspaceUi() {
  const [activeSection, setActiveSection] = useState("account-profile");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [spaceName, setSpaceName] = useState("");
  const [photo, setPhoto] = useState<PdpStudioAsset | null>(null);
  const [savedSection, setSavedSection] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getPdpStudioProfile()
      .then((profile) => {
        setDisplayName(profile.name);
        setEmail(profile.email);
        setSpaceName(profile.workspace.name);
        setPhoto(profile.photo);
      })
      .catch((caught) =>
        setError(caught instanceof Error ? caught.message : "Unable to load your profile."),
      );
  }, []);

  async function save(section: string): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      const profile = await updatePdpStudioProfile({
        ...(section === "account-profile" ? { name: displayName } : {}),
        ...(section === "space-details" ? { workspaceName: spaceName } : {}),
      });
      setDisplayName(profile.name);
      setSpaceName(profile.workspace.name);
      setPhoto(profile.photo);
      setSavedSection(section);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadPhoto(file: File): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      const asset = await uploadPdpStudioAsset(file, "profile");
      const profile = await updatePdpStudioProfile({ profilePhotoAssetId: asset.id });
      setPhoto(profile.photo);
      setSavedSection("account-profile");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update your profile photo.");
    } finally {
      setSaving(false);
    }
  }

  return {
    activeSection,
    displayName,
    email,
    spaceName,
    photo,
    savedSection,
    saving,
    error,
    setActiveSection,
    setDisplayName,
    setSpaceName,
    save,
    uploadPhoto,
  };
}
