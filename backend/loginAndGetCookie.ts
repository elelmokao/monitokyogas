import puppeteer from "puppeteer";
import dotenv from 'dotenv';
dotenv.config()
export async function loginAndGetCookie(): Promise<string> {
  const email = process.env.TOKYOGAS_EMAIL!;
  const password = process.env.TOKYOGAS_PASSWORD!;
  console.log("使用者 Email:", email);

  const browser = await puppeteer.launch({ headless: false }); // 可設成 false 看畫面
  const page = await browser.newPage();

  // 訪問登入頁面
  await page.goto("https://members.tokyo-gas.co.jp/", { waitUntil: "networkidle0" });

  // 點擊登入
  // 使用 class 和 href 更精確地選擇登入按鈕
  const goToLoginButtonSelector = 'a.text-center.flex.justify-center.w-full.rounded-lg.py-5.px-6.text-labelLarge.font-normal.bg-primary.text-onPrimary.cursor-pointer[href="/api/mtg/v1/auth/login"]';

  await page.waitForSelector(goToLoginButtonSelector, { visible: true, timeout: 10000 });

  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0" }),
    page.click(goToLoginButtonSelector),
  ]);

  // 填入帳密（請根據實際 input name 或 id 修改）
  await page.type('input[name="loginId"]', email);
  await page.type('input[name="password"]', password);

  // 點擊登入
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: "networkidle0" }),
  ]);

  // 成功登入後，取出 Cookie
  const cookies = await page.cookies();

  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join("; ");

  await browser.close();

  return cookieHeader;
}