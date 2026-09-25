export type ShippingCountryGroup = {
  id: string;
  label: string;
  countryCodes: readonly string[];
};

function countryCodes(value: string) {
  return value.split(" ");
}

export const SHIPPING_COUNTRY_GROUPS: readonly ShippingCountryGroup[] = [
  {
    id: "africa",
    label: "Africa",
    countryCodes: countryCodes(
      "DZ AO BJ BW BF BI CV CM CF TD KM CG CD CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU YT MA MZ NA NE NG RE RW SH ST SN SC SL SO ZA SS SD TZ TG TN UG EH ZM ZW",
    ),
  },
  {
    id: "asia",
    label: "Asia",
    countryCodes: countryCodes(
      "AF AM AZ BH BD BT BN KH CN CY GE HK IN ID IR IQ IL JP JO KZ KW KG LA LB MO MY MV MN MM NP KP KR OM PK PS PH QA SA SG LK SY TW TJ TH TL TR TM AE UZ VN YE IO",
    ),
  },
  {
    id: "europe",
    label: "Europe",
    countryCodes: countryCodes(
      "AL AD AT BY BE BA BG HR CZ DK EE FO FI FR DE GI GR GG VA HU IS IE IM IT JE LV LI LT LU MT MD MC ME NL MK NO PL PT RO RU SM RS SK SI ES SJ SE CH UA GB XK",
    ),
  },
  {
    id: "north-america",
    label: "North America",
    countryCodes: countryCodes(
      "AI AG AW BS BB BZ BM BQ CA KY CR CU CW DM DO SV GL GD GP GT HT HN JM MQ MX MS NI PA PR BL KN LC MF PM VC SX TT TC US VG VI",
    ),
  },
  {
    id: "south-america",
    label: "South America",
    countryCodes: countryCodes(
      "AR BO BR CL CO EC FK GF GY PY PE SR UY VE",
    ),
  },
  {
    id: "oceania",
    label: "Oceania",
    countryCodes: countryCodes(
      "AS AU CX CC CK FJ PF GU KI MH FM NR NC NZ NU NF MP PW PG PN WS SB TK TO TV UM VU WF",
    ),
  },
  {
    id: "antarctica",
    label: "Antarctica and subantarctic territories",
    countryCodes: countryCodes("AQ BV TF HM GS"),
  },
];

export const SHIPPING_COUNTRY_COUNT = SHIPPING_COUNTRY_GROUPS.reduce(
  (total, group) => total + group.countryCodes.length,
  0,
);

const ENGLISH_REGION_NAMES = new Intl.DisplayNames(["en"], { type: "region" });

export function shippingCountryName(code: string) {
  return ENGLISH_REGION_NAMES.of(code) ?? code;
}

export function shippingCountryFlag(code: string) {
  if (code === "XK") return "🇽🇰";
  return code.replace(/./g, (letter) =>
    String.fromCodePoint(127397 + letter.charCodeAt(0)),
  );
}
