export type NumericLike = number | null | undefined;

interface FormatNumberOptions {
  showSign?: boolean;
  fallback?: string;
}

const DEFAULT_FALLBACK = "–";

const suffixes = [
  { limit: 1_000_000_000, divisor: 1_000_000_000, suffix: "B", decimals: 2 },
  { limit: 100_000_000, divisor: 1_000_000, suffix: "M", decimals: 2 },
  { limit: 10_000_000, divisor: 1_000_000, suffix: "M", decimals: 1 },
  { limit: 1_000_000, divisor: 1_000_000, suffix: "M", decimals: 2 },
  { limit: 100_000, divisor: 1_000, suffix: "K", decimals: 0 },
  { limit: 10_000, divisor: 1_000, suffix: "K", decimals: 1 },
  { limit: 1_000, divisor: 1_000, suffix: "K", decimals: 2 },
];

const formatWithSuffix = (
  abs: number,
  suffix: { divisor: number; suffix: string; decimals: number }
) => `${(abs / suffix.divisor).toFixed(suffix.decimals)}${suffix.suffix}`;

export function formatCurrency(
  value: NumericLike,
  options: FormatNumberOptions = {}
): string {
  const { showSign = false, fallback = DEFAULT_FALLBACK } = options;
  if (value === null || value === undefined) {
    return fallback;
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return fallback;
  }
  if (num === 0) {
    return "₹0";
  }

  const sign = num < 0 ? "-" : showSign && num > 0 ? "+" : "";
  const abs = Math.abs(num);

  if (abs < 0.01) {
    return `${sign}<₹0.01`;
  }
  if (abs < 1) {
    return `${sign}₹${abs.toFixed(2)}`;
  }
  if (abs < 10) {
    return `${sign}₹${abs.toFixed(2)}`;
  }
  if (abs < 100) {
    return `${sign}₹${abs.toFixed(1)}`;
  }
  if (abs < 1_000) {
    return `${sign}₹${abs.toFixed(0)}`;
  }

  for (const step of suffixes) {
    if (abs >= step.limit) {
      return `${sign}₹${formatWithSuffix(abs, step)}`;
    }
  }

  return `${sign}₹${abs.toFixed(0)}`;
}

export function formatUnits(
  value: NumericLike,
  options: FormatNumberOptions = {}
): string {
  const { showSign = false, fallback = DEFAULT_FALLBACK } = options;
  if (value === null || value === undefined) {
    return fallback;
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return fallback;
  }
  if (num === 0) {
    return "0";
  }

  const sign = num < 0 ? "-" : showSign && num > 0 ? "+" : "";
  const abs = Math.abs(num);

  if (abs < 0.01) {
    return `${sign}<0.01`;
  }
  if (abs < 1) {
    return `${sign}${abs.toFixed(2)}`;
  }
  if (abs < 10) {
    return `${sign}${abs.toFixed(2)}`;
  }
  if (abs < 100) {
    return `${sign}${abs.toFixed(1)}`;
  }
  if (abs < 1_000) {
    return `${sign}${abs.toFixed(0)}`;
  }

  for (const step of suffixes) {
    if (abs >= step.limit) {
      return `${sign}${formatWithSuffix(abs, step)}`;
    }
  }

  return `${sign}${abs.toFixed(0)}`;
}

interface FormatPercentOptions {
  fromFraction?: boolean;
  showSign?: boolean;
  clampSmall?: number;
  fallback?: string;
  precisionBelowOne?: number;
  precisionDefault?: number;
}

export function formatPercent(
  value: NumericLike,
  options: FormatPercentOptions = {}
): string {
  const {
    fromFraction = false,
    showSign = false,
    clampSmall = 0.01,
    fallback = DEFAULT_FALLBACK,
    precisionBelowOne = 2,
    precisionDefault = 1,
  } = options;
  if (value === null || value === undefined) {
    return fallback;
  }
  const raw = Number(value);
  if (!Number.isFinite(raw)) {
    return fallback;
  }
  const scaled = fromFraction ? raw * 100 : raw;
  if (scaled === 0) {
    return "0.0%";
  }
  const abs = Math.abs(scaled);
  const sign = scaled < 0 ? "-" : showSign && scaled > 0 ? "+" : "";
  if (abs < clampSmall) {
    return `${sign}<${clampSmall}%`;
  }
  const decimals = abs < 1 ? precisionBelowOne : precisionDefault;
  return `${sign}${abs.toFixed(decimals)}%`;
}

const KPI_LABEL_OVERRIDES: Record<string, string> = {
  rev: "Revenue",
  revenue: "Revenue",
  rev_delta: "Revenue Δ",
  revenue_delta: "Revenue Δ",
  margin: "Margin",
  margin_delta: "Margin Δ",
  risk_adjusted_margin: "Risk-adjusted Margin",
  vol: "Volume",
  vol_delta: "Volume Δ",
  volume: "Volume",
  volume_delta: "Volume Δ",
  units: "Units",
  units_delta: "Units Δ",
  gm_percent: "GM%",
  spend: "Trade Spend",
  n_near_bound: "Near-bound SKUs",
};

export function humanizeKpiKey(key: string): string {
  const lower = key.toLowerCase();
  if (KPI_LABEL_OVERRIDES[lower]) {
    return KPI_LABEL_OVERRIDES[lower];
  }
  return key
    .replace(/_/g, " ")
    .split(" ")
    .map((token) => {
      if (!token) return token;
      const upper = token.toUpperCase();
      if (upper === "GM" || upper === "SKU" || upper === "NRM") {
        return upper;
      }
      return token.charAt(0).toUpperCase() + token.slice(1);
    })
    .join(" ");
}

export function formatKpiValueByKey(key: string, value: unknown): string {
  if (value === null || value === undefined) {
    return DEFAULT_FALLBACK;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return String(value);
  }

  const lower = key.toLowerCase();
  const isDelta =
    lower.includes("delta") || lower.includes("change") || lower.includes("impact");

  if (
    lower.includes("percent") ||
    lower.includes("pct") ||
    lower.endsWith("%") ||
    lower.endsWith("rate")
  ) {
    const fromFraction = Math.abs(value) <= 1;
    return formatPercent(value, { fromFraction, showSign: isDelta });
  }

  if (
    lower.includes("margin") ||
    lower.includes("rev") ||
    lower.includes("profit") ||
    lower.includes("spend") ||
    lower.includes("gm")
  ) {
    return formatCurrency(value, { showSign: isDelta });
  }

  if (lower.startsWith("n_") || lower.endsWith("_count") || lower.includes("sku")) {
    const sign = isDelta && value > 0 ? "+" : value < 0 ? "-" : "";
    return `${sign}${Math.abs(value).toFixed(0)}`;
  }

  if (lower.includes("unit") || lower.includes("vol") || lower.includes("demand")) {
    return formatUnits(value, { showSign: isDelta });
  }

  return formatUnits(value, { showSign: isDelta });
}
