MONITOKYOGAS is a project for retrieving daily electricity usage from Tokyo Gas based on user credentials. The backend crawler fetches data from the Tokyo Gas website, sends notifications to Discord. The process is designed to run automatically (e.g., via GitHub Actions) at 13:30 JST.

---

## Project Structure

- **backend/**: TypeScript crawler for fetching and storing electricity usage data. It also sends notification to discord.
- **frontend/**: A web dashboard for visualizing electricity usage data.

---

## How to Use
It can be runned in two ways via GitHub Actions or locally.

### 1. **Clone this repository.**
```bash
git clone https://github.com/elelmokao/monitokyogas
```
### 2. **Set environment variables**:
```env
TOKYOGAS_EMAIL=email
TOKYOGAS_PASSWORD=password
CONTRACT_NUMBER=contract_number
DC_CHANNEL_ID=channel_id
DC_TOKEN=your_discord_bot_token
```
* For **Github**, enable GitHub Actions in your repository settings, then set these environment variables in Secrets (`Settings -> Actions secrets and variables -> Repository secrets`).
* For **Local**: Copy `.env.example` to `.env` and fill in your credentials.
`TOKYOGAS_EMAIL`: your email adress registered for TokyoGas.
`TOKYOGAS_PASSWORD`: your password registered for TokyoGas.
`CONTRACT_NUMBER`: your TokyoGas `electricityContractNumber`. It can be shown in POST's request at usage of web page using Developer Mode.
`DC_CHANNEL_ID`: your discord chanenl ID.
`DC_TOKEN`: your discord bot token.
Please check [https://discord.com/developers/applications](https://discord.com/developers/applications)

### 3. **(LOCAL TEST) Run the backend crawler:**
```bash
cd backend
npm install
npx tsx fetchElectricity.ts
```
You can also schedule the crawler to run periodically using a cron job.

### 4. Discord Notification
If the crawler runs successfully, you will receive a notification in your specified Discord channel like:
```
⚡️**Tokyo Gas Report @ 2025-08-27**
* 昨日用電量：**1.2 kWh**
* 本月已用電量：**3.4 kWh**
* 剩餘可用電量：**115.4 kWh** / (120 kWh)
* 預算用電量：**1.0 kWh**
```

---

## Frontend

The frontend shows your current period, previous period, last 7/30/90 days of usage.
<img width="1883" height="788" alt="圖片" src="https://github.com/user-attachments/assets/261ef742-ab13-42e1-bcf6-76bedc4ae72a" />

---