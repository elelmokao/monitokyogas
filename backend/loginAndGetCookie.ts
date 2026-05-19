import puppeteer from "puppeteer";
import type { Page } from "puppeteer";
import dotenv from 'dotenv';
dotenv.config()

const HOME_URL = "https://members.tokyo-gas.co.jp/";
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
    // Visit the login page
    await page.goto(HOME_URL, { waitUntil: "domcontentloaded" });

    // Click the login button
    const goToLoginButtonSelector = 'a[href="/api/mtg/v1/auth/login"]';

    await page.waitForSelector(goToLoginButtonSelector, { visible: true, timeout: 15000 });

    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 }),
      page.click(goToLoginButtonSelector),
    ]);
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