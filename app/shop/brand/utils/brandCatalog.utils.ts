export const brandColorValues: Record<string, string> = {
  Black: "#111111",
  Camel: "#b3926f",
  Cobalt: "#2453d4",
  Coral: "#f05d49",
  "Ice blue": "#c9dce9",
  Lilac: "#c8afe8",
  White: "#f3f2ed",
};

export function formatBrandPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
