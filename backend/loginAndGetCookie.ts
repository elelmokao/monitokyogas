import puppeteer from "puppeteer";
import dotenv from 'dotenv';
dotenv.config()
export async function loginAndGetCookie(): Promise<string> {
  const email = process.env.TOKYOGAS_EMAIL!;
  const password = process.env.TOKYOGAS_PASSWORD!;
  if (!email || !password) {
    throw new Error("Please set TOKYOGAS_EMAIL and TOKYOGAS_PASSWORD in your .env file");
  }

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Visit the login page
  await page.goto("https://members.tokyo-gas.co.jp/", { waitUntil: "networkidle0" });

  // Click the login button
  const goToLoginButtonSelector = 'a.text-center.flex.justify-center.w-full.rounded-lg.py-5.px-6.text-labelLarge.font-normal.bg-primary.text-onPrimary.cursor-pointer[href="/api/mtg/v1/auth/login"]';

  await page.waitForSelector(goToLoginButtonSelector, { visible: true, timeout: 10000 });

  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0" }),
    page.click(goToLoginButtonSelector),
  ]);

  // Fill in email and password
  await page.type('input[name="loginId"]', email);
  await page.type('input[name="password"]', password);

  // Click the login button
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: "networkidle0" }),
  ]);

  // After successful login, retrieve cookies
  const cookies = await page.cookies();

  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join("; ");

  await browser.close();

  return cookieHeader;
}