# MONITOKYOGAS Setup

This project is portable when the GitHub repository, storage branch, Tokyo Gas credentials, and Discord bot values are set explicitly.

## Local Backend

Copy the backend env template:

```bash
cp backend/.env.example backend/.env
```

Required values:

- `TOKYOGAS_EMAIL`: Tokyo Gas member login email.
- `TOKYOGAS_PASSWORD`: Tokyo Gas member password.
- `CONTRACT_NUMBER`: Tokyo Gas electricity contract number.
- `DC_CHANNEL_ID`: Discord channel ID for reports.
- `DC_TOKEN`: Discord bot token.
- `GITHUB_REPOSITORY`: Repository slug in `owner/repo` form.

Defaulted values:

- `DATA_BRANCH=data`
- `MONTHLY_USAGE_LIMIT_KWH=120`
- `DAILY_BUDGET_KWH=4`
- `BILLING_CYCLE_START_DAY=24`

Run the config doctor before running the crawler:

```bash
pnpm -C backend run doctor
```

The doctor prints masked secrets, derived CSV file names, and the raw GitHub CSV URL. It does not log in to Tokyo Gas and does not send Discord messages.

## Local Frontend

Copy the frontend env template:

```bash
cp frontend/.env.example frontend/.env
```

Set:

- `VITE_GITHUB_OWNER`: GitHub account or organization that owns the repo.
- `VITE_GITHUB_REPO`: Repository name.
- `VITE_DATA_BRANCH`: CSV storage branch, usually `data`.
- `VITE_BASE_PATH`: GitHub Pages base path, usually `/<repo>/`.
- `VITE_HIGH_USAGE_KWH`: Dashboard high usage threshold.

Build locally:

```bash
pnpm -C frontend build
```

## GitHub Actions

Enable Actions and Pages in the fork. Add these repository secrets:

- `TOKYOGAS_EMAIL`
- `TOKYOGAS_PASSWORD`
- `CONTRACT_NUMBER`
- `DC_CHANNEL_ID`
- `DC_TOKEN`

The crawler workflow runs at `30 4 * * *` UTC, which is 13:30 JST. It writes CSV files to the `data` branch. The Pages workflow builds the dashboard with repository-specific Vite env values from GitHub context.

## Data Contract

CSV files live at:

```text
backend/csv_store/electricity_YYYY-MM.csv
```

The default billing cycle starts on day 24. Usage dates on or after the start day are stored in the following month file. For example, `2026-07-24` goes to `electricity_2026-08.csv`.
