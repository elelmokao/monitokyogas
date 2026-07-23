# Troubleshooting

## `doctor` reports missing values

Run:

```bash
pnpm -C backend run doctor
```

Fix every missing required value before running the crawler or notifier. Secrets are expected in `backend/.env` locally and in GitHub Actions repository secrets in CI.

## Frontend says CSV loading failed

Check the built frontend env values:

- `VITE_GITHUB_OWNER`
- `VITE_GITHUB_REPO`
- `VITE_DATA_BRANCH`
- `VITE_BASE_PATH`

Then open the derived raw CSV URL from the dashboard or doctor output. If GitHub returns 404, the `data` branch or monthly CSV file does not exist yet.

## Discord report fails after crawler succeeds

Confirm:

- `GITHUB_REPOSITORY` is set to `owner/repo`.
- `DATA_BRANCH` matches the branch where CSV files are pushed.
- `DC_CHANNEL_ID` is the numeric channel ID.
- The Discord bot has permission to send messages in that channel.

## Tokyo Gas login fails

The login flow depends on Tokyo Gas member site selectors and redirects. If credentials are correct but login fails:

- Run the crawler locally with `pnpm -C backend run fetch`.
- Check the `[login] login flow failed` URL and title in logs.
- Confirm Tokyo Gas does not require an additional verification step.
- Update selectors in `backend/loginAndGetCookie.ts` if Tokyo Gas changed the login page DOM.

## CSV files do not update

The scheduled workflow writes generated CSV files to the `data` branch. Check:

- Actions permission includes write access to contents.
- The crawler job produced files under `backend/csv_store/`.
- The workflow log did not say `No changes to commit`.
- The `data` branch exists or can be created by the workflow.
