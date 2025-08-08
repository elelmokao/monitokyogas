# MONITOKYOGAS

MONITOKYOGAS is a demonstration project for retrieving daily electricity usage from Tokyo Gas based on user credentials. The backend crawler fetches data from the Tokyo Gas website and stores it in a CSV file. The process is designed to run automatically (e.g., via GitHub Actions) at 13:30 JST.

---

## Project Structure

- **backend/**: Node.js/TypeScript crawler for fetching and storing electricity usage data.
- **frontend/**: (Work in Progress) A web dashboard for visualizing electricity usage data. The frontend is under active development and not yet feature-complete.

---

## How to Use

### 1. Running with GitHub Actions (Recommended)

1. **Clone this repository.**
2. **Set the following environment variables** in your GitHub repository settings:

    ```env
    TOKYOGAS_EMAIL=your_email@example.com
    TOKYOGAS_PASSWORD=your_password
    CONTRACT_NUMBER=your_contract_number
    ```

3. **Clear the CSV file** in the `csv_store` directory before the first run. (This will be automated in the future.)

### 2. Running Locally

1. **Copy** `.env.example` to `.env` and fill in your credentials:

    ```env
    TOKYOGAS_EMAIL=your_email@example.com
    TOKYOGAS_PASSWORD=your_password
    CONTRACT_NUMBER=your_contract_number
    ```

2. **Run the backend crawler:**

    ```bash
    cd backend
    npm install
    npx tsx fetchElectricity.ts
    ```

You can also schedule the crawler to run periodically using a cron job.

---

## Frontend (WIP)

The frontend is currently a work in progress. It aims to provide a modern dashboard for visualizing your electricity usage data. Stay tuned for updates!

---