"use client";

import { useState, type FormEvent } from "react";

export function useNewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitted">("idle");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;
    setStatus("submitted");
  }

  return {
    email,
    status,
    setEmail,
    handleSubmit,
  };
}
