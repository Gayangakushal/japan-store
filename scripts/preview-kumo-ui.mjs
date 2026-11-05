import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

// Actual installed Chrome, no browser dependency or database connection.
const folder = resolve(".local-catalogue-qa");
await mkdir(folder, { recursive: true });
const origin = "http://localhost:8080";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(fn, label, timeout = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const value = await fn();
      if (value) return value;
    } catch {}
    await delay(200);
  }
  throw new Error(`Timed out: ${label}`);
}
let chrome, socket;
let id = 0;
const pending = new Map();
function command(method, params = {}) {
  const current = ++id;
  return new Promise((resolve, reject) => {
    pending.set(current, { resolve, reject });
    socket.send(JSON.stringify({ id: current, method, params }));
  });
}
try {
  await until(async () => (await fetch(origin)).ok, "local Vite server");
  const profile = join(folder, `ui-${Date.now()}`);
  chrome = spawn(
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-networking",
      "--disable-component-update",
      "--disable-sync",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { windowsHide: true, stdio: ["ignore", "ignore", "ignore"] },
  );
  const active = await until(
    async () => await readFile(join(profile, "DevToolsActivePort"), "utf8"),
    "headless Chrome",
  );
  const debugPort = Number(active.split("\n")[0]);
  const pages = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  const page = pages.find((page) => page.type === "page");
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  const databaseRequests = [];
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const waiter = pending.get(message.id);
      if (waiter) {
        pending.delete(message.id);
        message.error
          ? waiter.reject(new Error(JSON.stringify(message.error)))
          : waiter.resolve(message.result);
      }
      return;
    }
    if (message.method === "Fetch.requestPaused") {
      const request = message.params;
      const readOnly = ["GET", "HEAD", "OPTIONS"].includes(request.request.method);
      if (!readOnly) databaseRequests.push(request.request.method + " " + request.request.url);
      void command(readOnly ? "Fetch.continueRequest" : "Fetch.failRequest", readOnly ? { requestId: request.requestId } : { requestId: request.requestId, errorReason: "BlockedByClient" }).catch(() => {});
    }
  });
  await command("Page.enable");
  await command("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });
  const evaluate = async (expression) => {
    const response = await command("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
    return response.result.value;
  };
  await command("Page.navigate", { url: origin });
  await until(
    async () =>
      await evaluate("document.querySelectorAll('article[data-ramen=\"true\"]').length===50"),
    "all 50 local catalogue cards",
  );
  const results = [];
  async function shot(name, width, height, expression = "") {
    await command("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 700 });
    if (expression) await evaluate(expression);
    await delay(450);
    const layout = await evaluate(`({overflow:document.documentElement.scrollWidth>innerWidth,viewport:innerWidth})`);
    assert.equal(layout.overflow, false, name + " horizontal overflow");
    const screenshot = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await writeFile(join(folder, name + ".png"), Buffer.from(screenshot.data,"base64"));
    results.push({name, ...layout});
  }
  await shot("cards-desktop",1440,1050,"document.querySelector('#shop').scrollIntoView();scrollBy(0,170)");
  await shot("cards-mobile",390,844,"document.querySelector('.collection-products').scrollIntoView();scrollBy(0,-15)");
  await evaluate("document.querySelector('.find-name').click()");
  await until(() => evaluate("!!document.querySelector('.product-single-view')"),"product details");
  assert.equal(await evaluate("document.querySelectorAll('.detail-related-card').length"),4);
  await evaluate("document.querySelector('.detail-toolbar button').click()");
  await command("Page.navigate", { url: origin + "/admin-preview" });
  await until(() => evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Open preview workspace'))"),"admin preview entry");
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Open preview workspace')).click()");
  await until(() => evaluate("!!document.querySelector('.admin-overview-banner')"),"dashboard overview");
  await shot("dashboard-desktop",1440,1100,"scrollTo(0,0)");
  await shot("dashboard-mobile",390,844,"scrollTo(0,0)");
  await evaluate("[...document.querySelectorAll('.admin-sidebar nav button')].find(b=>b.textContent.includes('Products')).click()");
  await shot("inventory-mobile",390,844,"scrollTo(0,0)");
  await evaluate("[...document.querySelectorAll('.admin-product-views button')].find(b=>b.textContent.includes('Price pending')).click()");
  assert.equal(await evaluate("[...document.querySelectorAll('.admin-price-cell')].every(cell=>cell.textContent.includes('Price pending'))"),true,"pending price filter");
  await evaluate(`(()=>{const input=document.querySelector('.admin-global-search input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Nissin Chicken Ramen');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await delay(250);
  assert.equal(await evaluate("document.querySelectorAll('tbody tr').length"),1,"workspace search");
  assert.equal(databaseRequests.length,0,"QA never changes remote data");
  await writeFile(join(folder,"ui-result.json"),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results));
} finally {
  if (socket?.readyState === 1) {
    try {
      await Promise.race([command("Browser.close"), delay(1500)]);
    } catch {}
    socket.close();
  }
  chrome?.kill();

}
