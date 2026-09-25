import type {
  AdminCreatorWaitlistResponse,
  CreatorAudienceSize,
  CreatorChannel,
  CreatorWaitlistApplicationView,
  CreatorWaitlistViewModel,
} from "../types";

const CHANNEL_LABELS: Record<CreatorChannel, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  threads: "Threads",
  youtube: "YouTube",
  pinterest: "Pinterest",
  blog: "Blog",
  other: "Other",
};

const AUDIENCE_LABELS: Record<CreatorAudienceSize, string> = {
  "under-10k": "Under 10K",
  "10k-50k": "10K–50K",
  "50k-250k": "50K–250K",
  "250k-1m": "250K–1M",
  "1m-plus": "1M+",
};

const COUNTRY_CODES =
  "AF AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW XK".split(
    " ",
  );
const COUNTRY_NAMES = new Intl.DisplayNames(["en"], { type: "region" });

function normalizeCountryName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const COUNTRY_CODE_BY_NAME = new Map<string, string>(
  COUNTRY_CODES.flatMap((code): Array<[string, string]> => {
    const name = COUNTRY_NAMES.of(code);
    const entries: Array<[string, string]> = [[code.toLowerCase(), code]];
    if (name) entries.push([normalizeCountryName(name), code]);
    return entries;
  }),
);

const COUNTRY_NAME_ALIASES: Record<string, string> = {
  "united states of america": "US",
  usa: "US",
  uk: "GB",
  uae: "AE",
  "south korea": "KR",
  "north korea": "KP",
  russia: "RU",
  "ivory coast": "CI",
  "czech republic": "CZ",
  palestine: "PS",
  taiwan: "TW",
};

function countryFlag(location: string): string | null {
  const normalizedLocation = normalizeCountryName(location);
  const code =
    COUNTRY_CODE_BY_NAME.get(normalizedLocation) ??
    COUNTRY_NAME_ALIASES[normalizedLocation];
  if (!code) return null;

  return code.replace(/[A-Z]/g, (letter) =>
    String.fromCodePoint(127397 + letter.charCodeAt(0)),
  );
}

function formatNewYorkDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not captured";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).format(date);
}

function displayProfileUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.hostname.replace(/^www\./, "")}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    return value;
  }
}

function mapApplication(
  item: AdminCreatorWaitlistResponse["items"][number],
): CreatorWaitlistApplicationView {
  const creatorProfiles = item.creatorProfiles.map((profile) => ({
    platform: profile.platform,
    platformLabel: CHANNEL_LABELS[profile.platform],
    url: profile.url,
    displayUrl: displayProfileUrl(profile.url),
    primary: profile.platform === item.primaryChannel,
  }));

  return {
    id: item.id,
    name: item.name,
    email: item.email,
    primaryChannelLabel: CHANNEL_LABELS[item.primaryChannel],
    creatorProfiles,
    audienceSizeLabel: AUDIENCE_LABELS[item.audienceSize],
    location: item.location,
    countryFlag: countryFlag(item.location),
    timezoneLabel: item.timezone || "Not captured",
    consentLabel: item.marketingConsent ? "Confirmed" : "Not confirmed",
    joinedNewYorkLabel: formatNewYorkDate(item.firstJoinedAt),
    lastSubmittedNewYorkLabel: formatNewYorkDate(item.lastSubmittedAt),
    submissionLabel:
      item.submissionCount === 1
        ? "1 submission"
        : `${item.submissionCount.toLocaleString("en-US")} submissions`,
    searchText: [
      item.name,
      item.email,
      item.location,
      item.timezone,
      AUDIENCE_LABELS[item.audienceSize],
      ...creatorProfiles.flatMap((profile) => [
        profile.platformLabel,
        profile.displayUrl,
      ]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  };
}

export function mapCreatorWaitlist(
  response: AdminCreatorWaitlistResponse,
): CreatorWaitlistViewModel {
  const audienceSizes = response.summary.audienceSizes;
  return {
    summary: response.summary,
    items: response.items.map(mapApplication),
    largerAudienceTotal:
      (audienceSizes["50k-250k"] ?? 0) +
      (audienceSizes["250k-1m"] ?? 0) +
      (audienceSizes["1m-plus"] ?? 0),
  };
}
