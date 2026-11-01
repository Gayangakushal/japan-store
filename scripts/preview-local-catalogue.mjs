import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

// Actual installed Chrome, no browser dependency or database connection.
const folder = resolve(".local-catalogue-qa");
await mkdir(folder, { recursive: true });
const reserve = createServer();
await new Promise((resolve) => reserve.listen(0, "127.0.0.1", resolve));
const port = reserve.address().port;
await new Promise((resolve) => reserve.close(resolve));
const origin = `http://127.0.0.1:${port}`;
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
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "dev",
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--strictPort",
  ],
  { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
);
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
  const profile = join(folder, `chrome-${Date.now()}`);
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
      if (/\/rest\/v1\/|\/auth\/v1\//.test(request.request.url))
        databaseRequests.push(request.request.url);
      // Permit only the local preview. Even accidental production requests are blocked.
      void command(
        request.request.url.startsWith(origin + "/")
          ? "Fetch.continueRequest"
          : "Fetch.failRequest",
        request.request.url.startsWith(origin + "/")
          ? { requestId: request.requestId }
          : { requestId: request.requestId, errorReason: "BlockedByClient" },
      ).catch(() => {});
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
  const decoded = await evaluate(
    `Promise.all([...document.querySelectorAll('article[data-ramen="true"] img')].map(async img=>{const check=new Image();check.src=img.src;const name=img.closest('article').querySelector('.find-name').textContent;try{await check.decode();return {name,src:img.getAttribute('src'),ok:true};}catch{return {name,src:img.getAttribute('src'),ok:false};}}))`,
  );
  assert.equal(decoded.length, 50);
  assert.equal(decoded.filter((image) => !image.ok).length, 0);
  assert.equal(new Set(decoded.map((image) => image.src)).size, 50);
  const manifest = JSON.parse(await readFile("catalogue/ramen-images.json", "utf8"));
  for (const photo of decoded)
    assert.equal(
      photo.src,
      manifest.find((entry) => entry.name === photo.name)?.image,
      `Exact image mapping for ${photo.name}`,
    );
  const results = [];
  for (const [name, width, height, columns] of [
    ["desktop", 1440, 1100, 4],
    ["mobile", 390, 844, 2],
  ]) {
    await command("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: name === "mobile",
    });
    await evaluate("document.querySelector('#shop').scrollIntoView();");
    await delay(300);
    const result = await evaluate(
      `({count:document.querySelectorAll('article[data-ramen="true"]').length,columns:getComputedStyle(document.querySelector('.collection-products')).gridTemplateColumns.split(' ').length,overflow:document.documentElement.scrollWidth>innerWidth})`,
    );
    assert.equal(result.count, 50);
    assert.equal(result.columns, columns);
    assert.equal(result.overflow, false);
    const screenshot = await command("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    await writeFile(join(folder, `${name}.png`), Buffer.from(screenshot.data, "base64"));
    results.push({ viewport: name, ...result });
  }
  assert.equal(databaseRequests.length, 0);
  await writeFile(
    join(folder, "result.json"),
    JSON.stringify({ results, decodedImages: decoded.length, databaseRequests: 0 }, null, 2),
  );
  console.log(
    "PASS browser:",
    JSON.stringify({ results, decodedImages: decoded.length, databaseRequests: 0 }),
  );
} finally {
  if (socket?.readyState === 1) {
    try {
      await Promise.race([command("Browser.close"), delay(1500)]);
    } catch {}
    socket.close();
  }
  chrome?.kill();
  server.kill();
}
