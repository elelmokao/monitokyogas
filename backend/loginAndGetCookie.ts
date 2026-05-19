import puppeteer from "puppeteer";
import type { Page } from "puppeteer";
import dotenv from 'dotenv';
dotenv.config()

const HOME_URL = "https://members.tokyo-gas.co.jp/";
const LOGIN_URL = "https://members.tokyo-gas.co.jp/api/mtg/v1/auth/login";
const MEMBERS_HOST = "members.tokyo-gas.co.jp";
const LOGIN_ID_SELECTOR = 'input[name="loginId"]';
const PASSWORD_SELECTOR = 'input[name="password"]';
const SUBMIT_SELECTOR = 'button[type="submit"]';

async function describePage(page: Page, label: string) {
  console.warn(`[login] ${label}: url=${page.url()} title=${await page.title()}`);
}

export async function loginAndGetCookie(): Promise<string> {
  const email = process.env.TOKYOGAS_EMAIL!;
  const password = process.env.TOKYOGAS_PASSWORD!;
  if (!email || !password) {
    throw new Error("Please set TOKYOGAS_EMAIL and TOKYOGAS_PASSWORD in your .env file");
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(60000);

  try {
    // Visit the top page first so cookies and redirects follow the same path as a normal user.
    await page.goto(HOME_URL, { waitUntil: "domcontentloaded" });

    // The landing page DOM is unstable in CI, so navigate to the login entrypoint directly.
    await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(LOGIN_ID_SELECTOR, { visible: true, timeout: 30000 });

    // Fill in email and password
    await page.type(LOGIN_ID_SELECTOR, email);
    await page.type(PASSWORD_SELECTOR, password);

    // Click the login button
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 }),
      page.click(SUBMIT_SELECTOR),
    ]);
    await page.waitForFunction(
      expectedHost => window.location.hostname === expectedHost,
      { timeout: 60000 },
      MEMBERS_HOST,
    );

    // After successful login, retrieve cookies
    const cookies = await page.cookies();

    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join("; ");

    return cookieHeader;
  } catch (error) {
    await describePage(page, "login flow failed");
    throw error;
  } finally {
    await browser.close();
  }
}