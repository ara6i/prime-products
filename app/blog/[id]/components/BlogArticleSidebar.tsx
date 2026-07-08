"use client";

import { Instagram, Linkedin, Send, Twitter } from "lucide-react";
import { useNewsletterForm } from "../../hooks/useNewsletterForm";

export function BlogArticleSidebar() {
  const { email, status, setEmail, handleSubmit } = useNewsletterForm();

  return (
    <aside className="space-y-7">
      <section className="rounded-[8px] border border-brand-blue/10 bg-white p-5 shadow-lg shadow-brand-blue/8">
        <h2 className="text-xl font-bold leading-tight text-text-primary">Don&apos;t Miss Out</h2>
        <p className="mt-2 text-sm leading-6 text-text-body">
          Join our newsletter for latest fit intelligence and storefront growth notes.
        </p>
        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <input
            type="text"
            placeholder="Firstname"
            className="h-11 w-full rounded-[8px] border border-brand-blue/10 bg-white px-4 text-sm outline-none transition placeholder:text-text-hint focus:border-brand-blue/40"
          />
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="h-11 w-full rounded-[8px] border border-brand-blue/10 bg-white px-4 text-sm outline-none transition placeholder:text-text-hint focus:border-brand-blue/40"
          />
          <button
            type="submit"
            className="flex h-11 w-full items-center justify-between rounded-full bg-text-primary px-5 text-sm font-bold text-white transition hover:bg-brand-blue"
          >
            Subscribe
            <Send size={15} />
          </button>
        </form>
        <p className="mt-3 text-xs font-semibold text-text-hint">
          {status === "submitted" ? "Subscribed for UI preview." : "Useful notes, zero spam."}
        </p>
      </section>

      <section>
        <h2 className="text-sm font-bold text-text-primary">Share this article</h2>
        <div className="mt-3 flex items-center gap-2">
          {[Twitter, Linkedin, Instagram].map((Icon, index) => (
            <button
              key={index}
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-blue/10 bg-white text-text-body transition hover:border-brand-blue/30 hover:text-brand-blue"
              aria-label="Share article"
            >
              <Icon size={15} />
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}
