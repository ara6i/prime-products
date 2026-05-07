"use client";

import { useState } from "react";
import { DEFAULT_APPAREL_PROMPT } from "../lib/defaultPrompts";

/**
 * Owns the prompt-editing UI state and derives everything downstream needs:
 * what to send to the backend (`promptToSend`), what kind of run it is
 * (`promptKind`), what to log into history (`promptForHistory`), and
 * whether the current input would be rejected by the backend.
 */
export function useCustomPrompt(): {
  customPrompt: string;
  setCustomPrompt: (next: string) => void;
  useDefault: boolean;
  setUseDefault: (next: boolean) => void;
  promptToSend: string | undefined;
  promptKind: "default" | "custom";
  promptForHistory: string;
  isInvalid: boolean;
} {
  const [customPrompt, setCustomPrompt] = useState<string>(DEFAULT_APPAREL_PROMPT);
  const [useDefault, setUseDefault] = useState<boolean>(true);

  const promptToSend = useDefault ? undefined : customPrompt;
  const promptKind: "default" | "custom" = useDefault ? "default" : "custom";
  const promptForHistory = useDefault ? DEFAULT_APPAREL_PROMPT : customPrompt;
  const isInvalid = !useDefault && customPrompt.trim().length === 0;

  return {
    customPrompt,
    setCustomPrompt,
    useDefault,
    setUseDefault,
    promptToSend,
    promptKind,
    promptForHistory,
    isInvalid,
  };
}
