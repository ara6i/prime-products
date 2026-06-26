"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { saveMerchantOnboardingProfileAction } from "../actions";
import type {
  MerchantOnboardingProfile,
  MerchantOnboardingProfileInput,
  MerchantOnboardingViewModel,
} from "../types";

type FieldName = keyof MerchantOnboardingProfileInput;
type FieldErrors = Partial<Record<FieldName, string>>;
type FieldTouched = Partial<Record<FieldName, boolean>>;

const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,63}$/i;
const WEBSITE_RE = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/i;

interface UseOnboardingProfileFormInput {
  profile: MerchantOnboardingProfile;
  onSaved: (onboarding: MerchantOnboardingViewModel) => void;
}

export function useOnboardingProfileForm({
  profile,
  onSaved,
}: UseOnboardingProfileFormInput) {
  const [values, setValues] = useState<MerchantOnboardingProfileInput>({
    name: profile.name,
    email: profile.email,
    website: profile.website,
    monthlyVisitors: profile.monthlyVisitors,
    catalogDescription: profile.catalogDescription ?? "",
    toolIntegration: "react-sdk",
    shareData: profile.shareData,
  });
  const [touched, setTouched] = useState<FieldTouched>({});
  const [saving, startSaving] = useTransition();

  const errors = useMemo(() => validateOnboardingProfile(values), [values]);
  const hasErrors = Object.keys(errors).length > 0;

  const setField =
    <K extends FieldName>(field: K) =>
    (value: MerchantOnboardingProfileInput[K]) => {
      setValues((current) => ({ ...current, [field]: value }));
    };

  const markTouched = (field: FieldName) => () => {
    setTouched((current) => ({ ...current, [field]: true }));
  };

  const submit = () => {
    setTouched({
      name: true,
      email: true,
      website: true,
      monthlyVisitors: true,
      catalogDescription: true,
      shareData: true,
    });

    if (hasErrors) {
      toast.warning("Complete the required details", {
        description: "Every field and the performance-data confirmation are required.",
      });
      return;
    }

    startSaving(async () => {
      try {
        const result = await saveMerchantOnboardingProfileAction({
          ...values,
          name: values.name.trim(),
          email: values.email.trim().toLowerCase(),
          website: values.website.trim(),
          monthlyVisitors: values.monthlyVisitors.trim(),
          catalogDescription: values.catalogDescription.trim(),
          toolIntegration: "react-sdk",
        });
        onSaved(result.onboarding);
        toast.success("Business profile saved", {
          description: "Your SDK workspace is now tied to this website.",
        });
      } catch (error) {
        toast.error("Could not save profile", {
          description: error instanceof Error ? error.message : "Please try again in a moment.",
        });
      }
    });
  };

  return {
    values,
    touched,
    errors,
    saving,
    setField,
    markTouched,
    submit,
  };
}

export function validateOnboardingProfile(values: MerchantOnboardingProfileInput): FieldErrors {
  const errors: FieldErrors = {};
  if (values.name.trim().length < 2) errors.name = "Enter your full name.";
  if (!values.email.trim()) {
    errors.email = "Work email is required.";
  } else if (!EMAIL_RE.test(values.email.trim())) {
    errors.email = "Enter a valid work email.";
  }
  if (!values.website.trim()) {
    errors.website = "Website is required.";
  } else if (!WEBSITE_RE.test(values.website.trim())) {
    errors.website = "Enter a valid website.";
  }
  if (!values.monthlyVisitors.trim()) {
    errors.monthlyVisitors = "Enter a rough monthly visitor count.";
  }
  if (!values.catalogDescription.trim()) {
    errors.catalogDescription = "Enter your apparel catalog and sizing setup.";
  }
  if (!values.shareData) {
    errors.shareData = "Confirm performance-data sharing to continue.";
  }
  return errors;
}
