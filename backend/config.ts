import dotenv from "dotenv";
import path from "path";

dotenv.config({ quiet: true });

export const DEFAULT_DATA_BRANCH = "data";
export const DEFAULT_MONTHLY_USAGE_LIMIT_KWH = 120;
export const DEFAULT_DAILY_BUDGET_KWH = 4;
export const DEFAULT_BILLING_CYCLE_START_DAY = 24;

export interface BackendConfig {
  tokyoGasEmail?: string;
  tokyoGasPassword?: string;
  contractNumber?: string;
  discordChannelId?: string;
  discordToken?: string;
  githubRepository?: string;
  dataBranch: string;
  monthlyUsageLimitKwh: number;
  dailyBudgetKwh: number;
  billingCycleStartDay: number;
  csvStoreDir: string;
  cookieFilePath: string;
}

export interface GithubRepositoryParts {
  owner: string;
  repo: string;
}

function optionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function readNumber(
  env: NodeJS.ProcessEnv,
  key: string,
  defaultValue: number,
): number {
  const rawValue = optionalString(env[key]);
  if (!rawValue) return defaultValue;

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${key} must be a positive number`);
  }

  return parsed;
}

function readBillingCycleStartDay(env: NodeJS.ProcessEnv): number {
  const value = readNumber(
    env,
    "BILLING_CYCLE_START_DAY",
    DEFAULT_BILLING_CYCLE_START_DAY,
  );

  if (!Number.isInteger(value) || value < 1 || value > 28) {
    throw new Error("BILLING_CYCLE_START_DAY must be an integer between 1 and 28");
  }

  return value;
}

export function parseGithubRepository(
  githubRepository: string | undefined,
): GithubRepositoryParts | undefined {
  const normalized = optionalString(githubRepository);
  if (!normalized) return undefined;

  const [owner, repo, ...rest] = normalized.split("/");
  if (!owner || !repo || rest.length > 0) {
    throw new Error("GITHUB_REPOSITORY must use the form owner/repo");
  }

  return { owner, repo };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BackendConfig {
  const csvStoreDir =
    optionalString(env.CSV_STORE_DIR) ?? path.join(__dirname, "csv_store");
  const cookieFilePath =
    optionalString(env.COOKIE_FILE_PATH) ??
    path.join(__dirname, "cookie_store", "cookie.txt");

  return {
    tokyoGasEmail: optionalString(env.TOKYOGAS_EMAIL),
    tokyoGasPassword: optionalString(env.TOKYOGAS_PASSWORD),
    contractNumber: optionalString(env.CONTRACT_NUMBER),
    discordChannelId: optionalString(env.DC_CHANNEL_ID),
    discordToken: optionalString(env.DC_TOKEN),
    githubRepository: optionalString(env.GITHUB_REPOSITORY),
    dataBranch: optionalString(env.DATA_BRANCH) ?? DEFAULT_DATA_BRANCH,
    monthlyUsageLimitKwh: readNumber(
      env,
      "MONTHLY_USAGE_LIMIT_KWH",
      DEFAULT_MONTHLY_USAGE_LIMIT_KWH,
    ),
    dailyBudgetKwh: readNumber(
      env,
      "DAILY_BUDGET_KWH",
      DEFAULT_DAILY_BUDGET_KWH,
    ),
    billingCycleStartDay: readBillingCycleStartDay(env),
    csvStoreDir,
    cookieFilePath,
  };
}

function requireFields(
  config: BackendConfig,
  fields: Array<keyof BackendConfig>,
  context: string,
): BackendConfig {
  const missing = fields.filter(field => !config[field]);
  if (missing.length > 0) {
    throw new Error(`${context} missing required env: ${missing.join(", ")}`);
  }

  return config;
}

export function requireTokyoGasConfig(
  config: BackendConfig = loadConfig(),
): BackendConfig {
  return requireFields(
    config,
    ["tokyoGasEmail", "tokyoGasPassword", "contractNumber"],
    "Tokyo Gas crawler",
  );
}

export function requireDiscordConfig(
  config: BackendConfig = loadConfig(),
): BackendConfig {
  requireFields(
    config,
    ["discordChannelId", "discordToken", "githubRepository"],
    "Discord notifier",
  );
  parseGithubRepository(config.githubRepository);
  return config;
}
