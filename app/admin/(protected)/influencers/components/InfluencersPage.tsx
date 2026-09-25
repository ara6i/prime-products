"use client";

import { useMemo, useState } from "react";
import {
  InstagramLogo,
  PinterestLogo,
  ThreadsLogo,
  TiktokLogo,
  YoutubeLogo,
} from "@phosphor-icons/react";
import {
  CheckCircle2,
  ExternalLink,
  Globe2,
  Search,
  UsersRound,
} from "lucide-react";
import type {
  CreatorWaitlistApplicationView,
  CreatorWaitlistProfileView,
  CreatorWaitlistViewModel,
} from "../types";

interface InfluencersPageProps {
  view: CreatorWaitlistViewModel;
}

function CreatorPlatformIcon({
  platform,
}: {
  platform: CreatorWaitlistProfileView["platform"];
}) {
  const iconClassName = "h-[18px] w-[18px] shrink-0";

  switch (platform) {
    case "instagram":
      return (
        <InstagramLogo
          className={`${iconClassName} text-pink-600`}
          weight="fill"
          aria-hidden
        />
      );
    case "tiktok":
      return (
        <TiktokLogo
          className={`${iconClassName} text-text-primary`}
          weight="fill"
          aria-hidden
        />
      );
    case "threads":
      return (
        <ThreadsLogo
          className={`${iconClassName} text-text-primary`}
          weight="fill"
          aria-hidden
        />
      );
    case "youtube":
      return (
        <YoutubeLogo
          className={`${iconClassName} text-red-600`}
          weight="fill"
          aria-hidden
        />
      );
    case "pinterest":
      return (
        <PinterestLogo
          className={`${iconClassName} text-red-600`}
          weight="fill"
          aria-hidden
        />
      );
    default:
      return (
        <Globe2 className={`${iconClassName} text-brand-blue`} aria-hidden />
      );
  }
}

function CreatorProfileLinks({
  profiles,
}: {
  profiles: CreatorWaitlistProfileView[];
}) {
  return (
    <div className="space-y-2">
      {profiles.map((profile) => (
        <a
          key={`${profile.platform}:${profile.url}`}
          href={profile.url}
          target="_blank"
          rel="noreferrer"
          className="group flex min-w-0 items-center gap-2 text-sm font-semibold text-brand-blue hover:underline"
        >
          <CreatorPlatformIcon platform={profile.platform} />
          <span className="shrink-0">{profile.platformLabel}</span>
          {profile.primary ? (
            <span className="shrink-0 rounded-full bg-customer-blue px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]">
              Primary
            </span>
          ) : null}
          <span className="min-w-0 truncate text-xs font-normal text-customer-muted group-hover:text-brand-blue">
            {profile.displayUrl}
          </span>
          <ExternalLink
            className="h-3.5 w-3.5 shrink-0 opacity-65 group-hover:opacity-100"
            aria-hidden
          />
        </a>
      ))}
    </div>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="rounded-[var(--radius-customer-card)] border border-dashed border-customer-border bg-customer-card px-6 py-16 text-center">
      <UsersRound className="mx-auto h-9 w-9 text-customer-muted" aria-hidden />
      <p className="mt-4 text-base font-semibold text-text-primary">
        {filtered ? "No matching creators" : "No creator applications yet"}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-customer-muted">
        {filtered
          ? "Try a name, email, country, platform, or profile handle."
          : "Completed creator waitlist applications will appear here automatically."}
      </p>
    </div>
  );
}

function InfluencersDesktop({
  items,
}: {
  items: CreatorWaitlistApplicationView[];
}) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card">
      <table className="w-full min-w-[1120px] border-collapse text-left">
        <thead className="border-b border-customer-border bg-customer-soft text-xs font-semibold uppercase tracking-[0.1em] text-customer-muted">
          <tr>
            <th className="px-5 py-4">Creator</th>
            <th className="px-5 py-4">Profiles</th>
            <th className="px-5 py-4">Audience</th>
            <th className="px-5 py-4">Location</th>
            <th className="px-5 py-4">Consent</th>
            <th className="px-5 py-4">Joined · New York time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-customer-border">
          {items.map((item) => (
            <tr
              key={item.id}
              className="align-top transition-colors hover:bg-customer-soft/55"
            >
              <td className="max-w-[250px] px-5 py-5">
                <p className="truncate font-semibold text-text-primary">
                  {item.name}
                </p>
                <a
                  href={`mailto:${item.email}`}
                  className="mt-1 block truncate text-sm text-brand-blue hover:underline"
                >
                  {item.email}
                </a>
              </td>
              <td className="max-w-[260px] px-5 py-5">
                <CreatorProfileLinks profiles={item.creatorProfiles} />
              </td>
              <td className="px-5 py-5">
                <p className="font-semibold text-text-primary">
                  {item.audienceSizeLabel}
                </p>
                <p className="mt-1 text-xs text-customer-muted">
                  Primary: {item.primaryChannelLabel}
                </p>
              </td>
              <td className="max-w-[190px] px-5 py-5">
                <p className="flex items-center gap-2 font-semibold text-text-primary">
                  {item.countryFlag ? (
                    <span
                      className="text-xl leading-none"
                      role="img"
                      aria-label={`${item.location} flag`}
                    >
                      {item.countryFlag}
                    </span>
                  ) : null}
                  {item.location}
                </p>
                <p className="mt-1 break-words text-xs text-customer-muted">
                  Creator timezone: {item.timezoneLabel}
                </p>
              </td>
              <td className="px-5 py-5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-customer-success-bg px-2.5 py-1 text-xs font-semibold text-customer-success-text">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  {item.consentLabel}
                </span>
              </td>
              <td className="whitespace-nowrap px-5 py-5">
                <p className="text-sm font-medium text-text-primary">
                  {item.joinedNewYorkLabel}
                </p>
                <p className="mt-1 text-xs text-customer-muted">
                  {item.submissionLabel}
                </p>
                {item.submissionLabel !== "1 submission" ? (
                  <p className="mt-1 text-xs text-customer-muted">
                    Latest · New York: {item.lastSubmittedNewYorkLabel}
                  </p>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InfluencersMobile({
  items,
}: {
  items: CreatorWaitlistApplicationView[];
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-2xl border border-customer-border bg-customer-card p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold leading-tight text-text-primary">
                {item.name}
              </h2>
              <a
                href={`mailto:${item.email}`}
                className="mt-1 block break-all text-sm text-brand-blue"
              >
                {item.email}
              </a>
            </div>
            <span className="max-w-[42%] shrink-0 rounded-full bg-customer-blue px-2.5 py-1 text-center text-xs font-semibold text-brand-blue">
              {item.audienceSizeLabel}
            </span>
          </div>

          <div className="mt-4 border-t border-customer-border pt-3.5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-customer-muted">
              Creator profiles
            </p>
            <CreatorProfileLinks profiles={item.creatorProfiles} />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3.5 border-t border-customer-border pt-3.5 text-sm">
            <div>
              <dt className="text-customer-muted">Country or region</dt>
              <dd className="mt-1 flex items-center gap-2 font-semibold text-text-primary">
                {item.countryFlag ? (
                  <span
                    className="text-xl leading-none"
                    role="img"
                    aria-label={`${item.location} flag`}
                  >
                    {item.countryFlag}
                  </span>
                ) : null}
                {item.location}
              </dd>
            </div>
            <div>
              <dt className="text-customer-muted">Creator timezone</dt>
              <dd className="mt-1 break-words font-semibold text-text-primary">
                {item.timezoneLabel}
              </dd>
            </div>
            <div>
              <dt className="text-customer-muted">Consent</dt>
              <dd className="mt-1 font-semibold text-customer-success-text">
                {item.consentLabel}
              </dd>
            </div>
            <div>
              <dt className="text-customer-muted">Joined · New York</dt>
              <dd className="mt-1 font-semibold text-text-primary">
                {item.joinedNewYorkLabel}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-customer-muted">
            {item.submissionLabel}
          </p>
        </article>
      ))}
    </div>
  );
}

export function InfluencersPage({ view }: InfluencersPageProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = useMemo(
    () =>
      view.items.filter(
        (item) => !normalizedQuery || item.searchText.includes(normalizedQuery),
      ),
    [normalizedQuery, view.items],
  );
  const isFiltered = normalizedQuery.length > 0;

  return (
    <section className="space-y-5 max-lg:space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4 max-lg:gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue max-lg:text-[11px]">
            Admin
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.04em] text-text-primary lg:text-4xl max-lg:mt-1 max-lg:text-3xl">
            Influencers
          </h1>
          <p className="mt-2 text-sm text-customer-muted max-lg:mt-1.5 max-lg:leading-5">
            Creators who completed the PrimeStyleAI influencer waitlist.
          </p>
          <p className="mt-1 text-xs font-medium text-customer-muted">
            All application timestamps are shown in New York time (ET).
          </p>
        </div>

        <label className="relative w-full max-w-sm max-lg:max-w-none">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-customer-muted"
            aria-hidden
          />
          <span className="sr-only">Search creator waitlist</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search creators, profiles, or country"
            className="h-11 w-full rounded-xl border border-customer-border bg-customer-card pl-10 pr-3 text-sm text-text-primary outline-none transition focus:border-brand-blue/60"
          />
        </label>
      </div>

      <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-2 max-lg:gap-3">
        <div className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-5 max-lg:col-span-2 max-lg:rounded-2xl max-lg:p-4">
          <UsersRound className="h-5 w-5 text-brand-blue" aria-hidden />
          <p className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-text-primary max-lg:mt-2 max-lg:text-2xl">
            {view.summary.total.toLocaleString("en-US")}
          </p>
          <p className="mt-1 text-sm text-customer-muted max-lg:text-xs">
            Waitlist creators
          </p>
        </div>
        <div className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-5 max-lg:rounded-2xl max-lg:p-4">
          <Globe2 className="h-5 w-5 text-brand-blue" aria-hidden />
          <p className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-text-primary max-lg:mt-2 max-lg:text-2xl">
            {view.summary.countries.toLocaleString("en-US")}
          </p>
          <p className="mt-1 text-sm text-customer-muted max-lg:text-xs">
            Countries or regions
          </p>
        </div>
        <div className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-5 max-lg:rounded-2xl max-lg:p-4">
          <CheckCircle2 className="h-5 w-5 text-brand-blue" aria-hidden />
          <p className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-text-primary max-lg:mt-2 max-lg:text-2xl">
            {view.largerAudienceTotal.toLocaleString("en-US")}
          </p>
          <p className="mt-1 text-sm text-customer-muted max-lg:text-xs">
            Creators with 50K+ audience
          </p>
        </div>
      </div>

      {filteredItems.length ? (
        <>
          <div className="hidden lg:block">
            <InfluencersDesktop items={filteredItems} />
          </div>
          <div className="lg:hidden">
            <InfluencersMobile items={filteredItems} />
          </div>
        </>
      ) : (
        <EmptyState filtered={isFiltered} />
      )}
    </section>
  );
}
