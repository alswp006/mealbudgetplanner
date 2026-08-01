import { chromium } from 'playwright';
import { spawn } from 'child_process';

const server = spawn('npx', ['vite', '--port', '5199'], { cwd: process.cwd(), stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 3000));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.addInitScript(() => {
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  window.localStorage.setItem('mbp_budget_v1', JSON.stringify({ [month]: { month, amount: 600000, createdAt: Date.now(), updatedAt: Date.now() } }));
  window.localStorage.setItem('mbp_meals_v1', JSON.stringify([
    { id: 's1', date: today, mealType: 'lunch', category: 'delivery', amount: 12000, memo: '', createdAt: Date.now() },
  ]));
});
await page.goto('http://localhost:5199/');
await page.waitForTimeout(1000);
await page.screenshot({ path: '/tmp/ai-factory-work/mealbudgetplanner-00ux/home-with-budget.png' });
await browser.close();
server.kill();
