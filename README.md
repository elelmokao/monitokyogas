MONITOKYOGAS retrieves daily electricity usage from Tokyo Gas, stores the CSV history in a GitHub `data` branch, sends a Discord report, and serves a Vue dashboard from GitHub Pages.

## Project Structure

- `backend/`: Tokyo Gas crawler, CSV writer, Discord notifier, config doctor, and unit tests.
- `frontend/`: Vue dashboard that reads CSV files from GitHub raw content.
- `.github/workflows/`: scheduled crawler, CSV branch update, and GitHub Pages deployment.

## Quick Start

1. Fork or clone this repository.

2. Install dependencies with pnpm.

```bash
pnpm -C backend install
pnpm -C frontend install
```

3. Configure backend secrets.

```bash
cp backend/.env.example backend/.env
```

Fill in `TOKYOGAS_EMAIL`, `TOKYOGAS_PASSWORD`, `CONTRACT_NUMBER`, `DC_CHANNEL_ID`, `DC_TOKEN`, and `GITHUB_REPOSITORY`.

4. Configure frontend local development.

```bash
cp frontend/.env.example frontend/.env
```

Set `VITE_GITHUB_OWNER` and `VITE_GITHUB_REPO` to your fork.

5. Check configuration without logging in to Tokyo Gas or sending Discord messages.

```bash
pnpm -C backend run doctor
```

6. Run local checks.

```bash
pnpm -C backend test
pnpm -C frontend build
```

7. Run the crawler manually only after the doctor output is clean.

```bash
pnpm -C backend run fetch
```

## GitHub Actions Setup

For scheduled operation, enable Actions and Pages in your fork, then add these repository secrets:

- `TOKYOGAS_EMAIL`
- `TOKYOGAS_PASSWORD`
- `CONTRACT_NUMBER`
- `DC_CHANNEL_ID`
- `DC_TOKEN`

The default storage branch is `data`. The scheduled crawler writes monthly CSV files to `backend/csv_store/` on that branch. The frontend Pages workflow injects your repository owner, repository name, base path, and `data` branch at build time.

Detailed setup and failure diagnosis are in [docs/setup.md](docs/setup.md) and [docs/troubleshooting.md](docs/troubleshooting.md).

## Dashboard

The frontend shows the current billing period, previous billing period, recent usage ranges, missing days, high usage days, and CSV health.

<img width="1883" height="788" alt="Dashboard screenshot" src="https://github.com/user-attachments/assets/261ef742-ab13-42e1-bcf6-76bedc4ae72a" />
