import { expect, test, type Page } from "@playwright/test";

const cover = (page: Page) => page.locator(".animated-cover");
const replay = (page: Page) => page.getByRole("button", { name: "Rever animação" });
const dock = (page: Page) => page.locator(".player-dock");
const progress = (page: Page) => page.getByRole("slider", { name: "Progresso da música" });
const poster = (page: Page) => page.locator('img[src$="morph-first.webp"]');
const finalPoster = (page: Page) => page.locator('img[src$="morph-last.webp"]');
const audioTime = (page: Page) =>
  page.locator("audio").evaluate((el: HTMLAudioElement) => el.currentTime);
const videoTime = (page: Page) =>
  page.locator("video").evaluate((el: HTMLVideoElement) => el.currentTime);
const play = (page: Page) =>
  dock(page).getByRole("button", { name: "Reproduzir", exact: true }).click();
const pause = (page: Page) =>
  dock(page).getByRole("button", { name: "Pausar", exact: true }).click();

async function open(page: Page) {
  await page.goto("/");
  await expect(replay(page)).toBeVisible();
  await expect
    .poll(() => page.locator("audio").evaluate((el: HTMLAudioElement) => el.readyState))
    .toBeGreaterThan(1);
}

test("poster, first effective playback, independent ending, manual replay and audio lifecycle", async ({
  page,
}) => {
  const errors: string[] = [];
  const videoRequests: string[] = [];
  const firstPosterRequests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.url().endsWith("morph.mp4")) videoRequests.push(request.url());
    if (request.url().endsWith("morph-first.webp")) firstPosterRequests.push(request.url());
  });
  await open(page);
  await expect(poster(page)).toHaveCSS("opacity", "1");
  expect(videoRequests).toHaveLength(0);
  expect(firstPosterRequests).toHaveLength(1);
  await expect(page.locator("video")).toHaveJSProperty("muted", true);
  await expect(page.locator("video")).toHaveJSProperty("playsInline", true);
  await expect(page.locator("video")).toHaveJSProperty("loop", false);
  await expect(page.locator("video")).toHaveJSProperty("controls", false);
  await play(page);
  await expect.poll(() => videoTime(page)).toBeGreaterThan(0.1);
  await expect.poll(() => audioTime(page)).toBeGreaterThan(0.1);
  await pause(page);
  const pausedAt = await audioTime(page);
  await expect(cover(page)).toHaveAttribute("data-animation-state", "ended", { timeout: 10_000 });
  expect(await audioTime(page)).toBeCloseTo(pausedAt, 1);
  await expect(finalPoster(page)).toHaveCSS("opacity", "1");
  expect(await videoTime(page)).toBeCloseTo(6, 1);
  await replay(page).click();
  await expect(cover(page)).toHaveAttribute("data-animation-state", "playing");
  expect(await videoTime(page)).toBeLessThan(2);
  expect(await audioTime(page)).toBeCloseTo(pausedAt, 1);
  await expect(page.locator("audio")).toHaveJSProperty("paused", true);
  await expect(cover(page)).toHaveAttribute("data-animation-state", "ended", { timeout: 10_000 });
  await play(page);
  await progress(page).fill("60");
  await expect(page.locator('[aria-current="true"]')).toHaveText(
    "Líquido inflamável, tome cuidado",
  );
  await dock(page).getByRole("button", { name: "Avançar 10 segundos" }).click();
  await expect.poll(() => audioTime(page)).toBeGreaterThan(69);
  await dock(page).getByRole("button", { name: "Voltar 10 segundos" }).click();
  expect(await audioTime(page)).toBeLessThan(63);
  const duration = await page.locator("audio").evaluate((el: HTMLAudioElement) => el.duration);
  await progress(page).fill((duration - 0.4).toFixed(2));
  await expect(page.locator("audio")).toHaveJSProperty("ended", true);
  await play(page);
  await expect.poll(() => audioTime(page)).toBeLessThan(3);
  await expect(cover(page)).toHaveAttribute("data-animation-state", "ended");
  await expect(finalPoster(page)).toHaveCSS("opacity", "1");
  expect(errors).toEqual([]);
});

test("reduced motion has no video download or autoplay, keyboard replay controls only video", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith("morph.mp4")) requests.push(r.url());
  });
  await open(page);
  await play(page);
  await expect.poll(() => audioTime(page)).toBeGreaterThan(0.3);
  await pause(page);
  await expect(cover(page)).toHaveAttribute("data-animation-state", "idle");
  expect(requests).toEqual([]);
  for (let step = 0; step < 8; step += 1) {
    if (await replay(page).evaluate((el) => el === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(replay(page)).toBeFocused();
  expect(
    await replay(page).evaluate((el) => parseFloat(getComputedStyle(el).outlineWidth)),
  ).toBeGreaterThan(0);
  const before = await audioTime(page);
  await replay(page).press("Enter");
  await expect(cover(page)).toHaveAttribute("data-animation-state", "playing");
  await expect.poll(() => videoTime(page)).toBeGreaterThan(0.1);
  expect(await audioTime(page)).toBeCloseTo(before, 1);
  await expect(page.locator("audio")).toHaveJSProperty("paused", true);
});

test("motion preference changes stop automatic playback and never schedule a delayed replay", async ({
  page,
}) => {
  await open(page);
  await play(page);
  await expect.poll(() => videoTime(page)).toBeGreaterThan(0.1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(cover(page)).toHaveAttribute("data-animation-state", "idle");
  await expect(page.locator("video")).toHaveJSProperty("paused", true);
  await expect(poster(page)).toHaveCSS("opacity", "1");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await pause(page);
  await play(page);
  await expect(cover(page)).toHaveAttribute("data-animation-state", "idle");
  await expect(page.locator("video")).toHaveJSProperty("paused", true);
});

test("manual preview before music consumes the automatic run", async ({ page }) => {
  await open(page);
  await replay(page).click();
  await expect(cover(page)).toHaveAttribute("data-animation-state", "ended", { timeout: 10_000 });
  await play(page);
  await expect.poll(() => audioTime(page)).toBeGreaterThan(0.2);
  await expect(cover(page)).toHaveAttribute("data-animation-state", "ended");
});

test("slow video never blocks audio or lyric synchronization", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/media/siga-rota-morph.mp4", async (route) => {
    await gate;
    await route.continue();
  });
  await open(page);
  await play(page);
  await expect.poll(() => audioTime(page)).toBeGreaterThan(0.4);
  await expect(cover(page)).toHaveAttribute("data-animation-state", "loading");
  await expect(poster(page)).toHaveCSS("opacity", "1");
  await progress(page).fill("60");
  await expect(page.locator('[aria-current="true"]')).toHaveText(
    "Líquido inflamável, tome cuidado",
  );
  release();
  await expect(cover(page)).toHaveAttribute("data-animation-state", "playing");
});

test("audio rejection does not trigger the animation", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      return this instanceof HTMLAudioElement
        ? Promise.reject(new DOMException("Blocked for test", "NotAllowedError"))
        : original.call(this);
    };
  });
  await open(page);
  await play(page);
  await expect(page.getByRole("alert")).toContainText("bloqueou");
  await expect(cover(page)).toHaveAttribute("data-animation-state", "idle");
  await expect(page.locator("video")).toHaveJSProperty("currentTime", 0);
});

test("video 404 keeps poster, audio, lyrics and manual recovery working", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/media/siga-rota-morph.mp4", (route) =>
    route.fulfill({ status: 404, body: "Not found" }),
  );
  await open(page);
  await play(page);
  await expect(cover(page)).toHaveAttribute("data-animation-state", "error");
  await expect(poster(page)).toHaveCSS("opacity", "1");
  await expect.poll(() => audioTime(page)).toBeGreaterThan(0.1);
  await progress(page).fill("60");
  await expect(page.locator('[aria-current="true"]')).toHaveText(
    "Líquido inflamável, tome cuidado",
  );
  await pause(page);
  await play(page);
  await expect(cover(page)).toHaveAttribute("data-animation-state", "error");
  await page.unroute("**/media/siga-rota-morph.mp4");
  await replay(page).click();
  await expect(cover(page)).toHaveAttribute("data-animation-state", "playing");
  expect(await audioTime(page)).toBeGreaterThan(59);
  expect(errors).toEqual([]);
});

for (const mode of ["reject", "throw"] as const) {
  test(`video play ${mode} has no unhandled error and can retry`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript((mode) => {
      const original = HTMLMediaElement.prototype.play;
      let once = true;
      HTMLMediaElement.prototype.play = function () {
        if (this instanceof HTMLVideoElement && once) {
          once = false;
          const error = new DOMException("Blocked for test", "NotAllowedError");
          if (mode === "throw") throw error;
          return Promise.reject(error);
        }
        return original.call(this);
      };
    }, mode);
    await open(page);
    await play(page);
    await expect(cover(page)).toHaveAttribute("data-animation-state", "error");
    await expect(poster(page)).toHaveCSS("opacity", "1");
    await expect.poll(() => audioTime(page)).toBeGreaterThan(0.2);
    await replay(page).click();
    await expect(cover(page)).toHaveAttribute("data-animation-state", "playing");
    expect(errors).toEqual([]);
  });
}

test("missing final poster retains native final video frame", async ({ page }) => {
  await page.route("**/media/siga-rota-morph-last.webp", (route) =>
    route.fulfill({ status: 404, body: "Not found" }),
  );
  await open(page);
  await replay(page).click();
  await expect(cover(page)).toHaveAttribute("data-animation-state", "ended", { timeout: 10_000 });
  await expect(poster(page)).toHaveCSS("opacity", "0");
  await expect(finalPoster(page)).toHaveCSS("opacity", "0");
  await expect(page.locator("video")).toHaveJSProperty("ended", true);
  expect(await videoTime(page)).toBeCloseTo(6, 1);
});

test("lyrics still follow audio and scroll into view after selecting a verse", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page);
  await page
    .getByRole("button", { name: "No quadro de energia, perigo no ar", exact: true })
    .click();
  await expect(page.locator('[aria-current="true"]')).toHaveText(
    "No quadro de energia, perigo no ar",
  );
  expect(await audioTime(page)).toBeGreaterThan(115);
  await expect
    .poll(() =>
      page.locator(".lyrics-mask").evaluate((el) => {
        const line = el.querySelector('[aria-current="true"]')!.getBoundingClientRect();
        const viewport = el.getBoundingClientRect();
        return Math.abs((line.top + line.bottom) / 2 - (viewport.top + viewport.bottom) / 2);
      }),
    )
    .toBeLessThan(10);
  await pause(page);
  await progress(page).fill("15.3");
  await expect(page.locator('[aria-current="true"]')).toHaveText(
    "O fogo avança, mas não se assusta",
  );
  await play(page);
  await expect.poll(() => audioTime(page)).toBeGreaterThan(15.4);
});

for (const [width, height, scale] of [
  [360, 800, 100],
  [390, 844, 100],
  [768, 1024, 100],
  [1440, 1000, 100],
  [360, 800, 200],
]) {
  test(`square media and accessible controls at ${width}px / ${scale}%`, async ({ page }) => {
    await page.setViewportSize({ width: width!, height: height! });
    await open(page);
    await page.evaluate((scale) => {
      document.documentElement.style.fontSize = `${scale}%`;
    }, scale);
    const metrics = await page.evaluate(() => {
      const media = document.querySelector(".animated-cover-media")!.getBoundingClientRect();
      const actions = document.querySelector(".animated-cover-actions")!.getBoundingClientRect();
      const controls = Array.from(
        document.querySelectorAll(".animated-cover-actions button, .player-dock button"),
      );
      return {
        square: Math.abs(media.width - media.height),
        fit: getComputedStyle(document.querySelector("video")!).objectFit,
        below: actions.top >= media.bottom,
        overflow: document.documentElement.scrollWidth > innerWidth,
        collisions: controls.some((button, i) => {
          const a = button.getBoundingClientRect();
          return (
            a.left < 0 ||
            a.right > innerWidth ||
            a.width < 44 ||
            a.height < 44 ||
            controls.slice(i + 1).some((other) => {
              const b = other.getBoundingClientRect();
              return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
            })
          );
        }),
      };
    });
    expect(metrics).toEqual({
      square: 0,
      fit: "contain",
      below: true,
      overflow: false,
      collisions: false,
    });
    await replay(page).scrollIntoViewIfNeeded();
    await expect(replay(page)).toBeInViewport();
    if (scale === 100) {
      await page.screenshot({ path: `artifacts/morph-${width}-poster.png`, fullPage: true });
      await replay(page).click();
      await expect(cover(page)).toHaveAttribute("data-animation-state", "ended", {
        timeout: 10_000,
      });
      await page.screenshot({ path: `artifacts/morph-${width}-ended.png`, fullPage: true });
    }
  });
}

test("SSR, bundled media and range requests are available", async ({ request }) => {
  const home = await request.get("/");
  expect(home.status()).toBe(200);
  expect(await home.text()).toContain("morph-first.webp");
  const response = await request.get("/media/siga-rota-morph.mp4", {
    headers: { Range: "bytes=0-1023" },
  });
  expect(response.status()).toBe(206);
  expect(response.headers()["content-range"]).toBe("bytes 0-1023/2563643");
  for (const file of ["siga-rota-morph-first.webp", "siga-rota-morph-last.webp"]) {
    expect((await request.get(`/media/${file}`)).status()).toBe(200);
  }
});
