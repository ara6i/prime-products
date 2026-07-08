"use client";

import { Send } from "lucide-react";
import { useNewsletterForm } from "../hooks/useNewsletterForm";

export function BlogNewsletter() {
  const { email, status, setEmail, handleSubmit } = useNewsletterForm();

  return (
    <section className="mx-auto w-full max-w-[760px] px-5 py-16 text-center md:px-8 md:py-20">
      <h2 className="text-[32px] font-bold leading-tight text-text-primary md:text-[42px]">
        Subscribe to our Newsletter
      </h2>
      <p className="mx-auto mt-3 max-w-[460px] text-sm leading-6 text-text-body">
        Get practical AI sizing, try-on, and Shopify growth notes in your inbox.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mx-auto mt-7 flex max-w-[430px] overflow-hidden rounded-full border border-brand-blue/10 bg-white p-1 shadow-lg shadow-brand-blue/10"
      >
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Enter your email"
          className="min-w-0 flex-1 bg-transparent px-4 text-sm text-text-primary outline-none placeholder:text-text-hint"
        />
        <button
          type="submit"
          className="flex h-10 items-center gap-2 rounded-full bg-brand-blue px-5 text-sm font-bold text-white transition hover:bg-brand-blue-dark"
        >
          <Send size={15} />
          Subscribe
        </button>
      </form>

      <p className="mt-3 text-xs font-semibold text-text-hint">
        {status === "submitted" ? "Subscribed for UI preview." : "Useful notes, zero spam."}
      </p>
    </section>
  );
}
