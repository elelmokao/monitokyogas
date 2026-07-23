const DEFAULT_DATA_BRANCH = "data";
const DEFAULT_HIGH_USAGE_KWH = 4;
const DEFAULT_BILLING_CYCLE_START_DAY = 24;

function optionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function readNumber(value: string | undefined, defaultValue: number): number {
  const normalized = optionalString(value);
  if (!normalized) return defaultValue;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

export interface AppConfig {
  githubOwner?: string;
  githubRepo?: string;
  dataBranch: string;
  basePath: string;
  highUsageKwh: number;
  billingCycleStartDay: number;
}

export function getAppConfig(): AppConfig {
  return {
    githubOwner: optionalString(import.meta.env.VITE_GITHUB_OWNER),
    githubRepo: optionalString(import.meta.env.VITE_GITHUB_REPO),
    dataBranch:
      optionalString(import.meta.env.VITE_DATA_BRANCH) ?? DEFAULT_DATA_BRANCH,
    basePath: optionalString(import.meta.env.VITE_BASE_PATH) ?? "/",
    highUsageKwh: readNumber(
      import.meta.env.VITE_HIGH_USAGE_KWH,
      DEFAULT_HIGH_USAGE_KWH,
    ),
    billingCycleStartDay: DEFAULT_BILLING_CYCLE_START_DAY,
  };
}
