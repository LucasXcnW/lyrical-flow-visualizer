import { expect, test, type Page } from "@playwright/test";

type Location = "cover" | "dock";
const cover = (page: Page) => page.locator(".animated-cover");
const dock = (page: Page) => page.locator(".player-dock");
const progress = (page: Page) => page.getByRole("slider", { name: "Progresso da música" });
const poster = (page: Page) => page.locator('img[src$="morph-first.webp"]');
const finalPoster = (page: Page) => page.locator('img[src$="morph-last.webp"]');
const button = (page: Page, location: Location = "dock") =>
  (location === "cover" ? page.locator(".animated-cover-actions") : dock(page)).getByRole(
    "button",
    { name: /^(Reproduzir|Pausar)$/ },
  );
const toggle = (page: Page, location: Location = "dock") => button(page, location).click();
const audioTime = (page: Page) =>
  page.locator("audio").evaluate((el: HTMLAudioElement) => el.currentTime);
const videoTime = (page: Page) =>
  page.locator("video").evaluate((el: HTMLVideoElement) => el.currentTime);
const calls = (page: Page) =>
  page.evaluate(() => (window as unknown as { videoPlayCalls: number }).videoPlayCalls);
const duration = (page: Page) =>
  page.locator("audio").evaluate((el: HTMLAudioElement) => el.duration);
const drift = (page: Page) =>
  page.evaluate(() =>
    Math.abs(
      document.querySelector("video")!.currentTime -
        Math.max(0, Math.min(6, document.querySelector("audio")!.currentTime - 12)),
    ),
  );

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(window, { videoPlayCalls: 0 });
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (this instanceof HTMLVideoElement)
        (window as unknown as { videoPlayCalls: number }).videoPlayCalls += 1;
      return original.call(this);
    };
  });
});
async function open(page: Page) {
  await page.goto("/");
  await expect(button(page, "cover")).toBeVisible();
  await expect
    .poll(() => page.locator("audio").evaluate((el: HTMLAudioElement) => el.readyState))
    .toBeGreaterThan(1);
}

for (const width of [360, 1440]) {
  for (const location of ["cover", "dock"] as const) {
    test(`${width}px ${location}: crosses 12, pauses and resumes the same frame`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await open(page);
      await toggle(page, location);
      await expect.poll(() => audioTime(page)).toBeGreaterThan(0.2);
      expect(await videoTime(page)).toBe(0);
      expect(await calls(page)).toBe(0);
      await expect(poster(page)).toHaveCSS("opacity", "1");
      await progress(page).fill("11.3");
      await expect.poll(() => audioTime(page)).toBeGreaterThan(13);
      await expect(cover(page)).toHaveAttribute("data-animation-state", "playing");
      await expect(poster(page)).toHaveCSS("opacity", "0");
      await expect.poll(() => drift(page)).toBeLessThan(0.15);
      const other = location === "cover" ? "dock" : "cover";
      await toggle(page, other);
      await expect(cover(page)).toHaveAttribute("data-animation-state", "paused");
      await expect(page.locator("video")).toHaveJSProperty("seeking", false);
      const frozen = await videoTime(page);
      const audioAt = await audioTime(page);
      const frame = await page.locator(".animated-cover-media").screenshot();
      await page.waitForTimeout(400);
      expect(await videoTime(page)).toBe(frozen);
      expect(await audioTime(page)).toBe(audioAt);
      expect((await page.locator(".animated-cover-media").screenshot()).equals(frame)).toBe(true);
      await toggle(page, other);
      await expect(cover(page)).toHaveAttribute("data-animation-state", "playing");
      expect(await videoTime(page)).toBeGreaterThanOrEqual(frozen - 0.03);
      await expect.poll(() => videoTime(page)).toBeGreaterThan(frozen + 0.2);
      await expect.poll(() => drift(page)).toBeLessThan(0.15);
      await toggle(page, location);
    });
  }
  test(`${width}px seeking maps initial, middle and last frames`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page);
    for (const [audio, video, phase] of [
      [14, 2, "paused"],
      [18, 6, "ended"],
      [13, 1, "paused"],
      [8, 0, "idle"],
      [16, 4, "paused"],
    ] as const) {
      await progress(page).fill(String(audio));
      await expect.poll(() => videoTime(page)).toBeCloseTo(video, 1);
      await expect(cover(page)).toHaveAttribute("data-animation-state", phase);
      await expect(page.locator("video")).toHaveJSProperty("paused", true);
    }
    await toggle(page);
    await progress(page).fill("14");
    await expect.poll(() => drift(page)).toBeLessThan(0.15);
    await dock(page).getByRole("button", { name: "Voltar 10 segundos" }).click();
    await expect(poster(page)).toHaveCSS("opacity", "1");
    await expect(cover(page)).toHaveAttribute("data-animation-state", "idle");
    await dock(page).getByRole("button", { name: "Avançar 10 segundos" }).click();
    await expect(poster(page)).toHaveCSS("opacity", "0");
    await expect.poll(() => drift(page)).toBeLessThan(0.15);
    await progress(page).fill("70");
    await expect(finalPoster(page)).toHaveCSS("opacity", "1");
    await expect(page.locator('[aria-current="true"]')).toHaveText(
      "Essa barra de apagar e saber o que fazer",
    );
    await progress(page).fill("0");
    await expect(poster(page)).toHaveCSS("opacity", "1");
  });
}

test("poster sharing, deferred loading and media attributes", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("siga-rota-morph")) requests.push(r.url());
  });
  await open(page);
  expect(requests.filter((url) => url.endsWith("morph.mp4"))).toHaveLength(0);
  expect(requests.filter((url) => url.endsWith("morph-first.webp"))).toHaveLength(1);
  await expect(page.locator("header svg")).toHaveCount(0);
  for (const [property, value] of [
    ["muted", true],
    ["playsInline", true],
    ["loop", false],
    ["controls", false],
  ] as const)
    await expect(page.locator("video")).toHaveJSProperty(property, value);
});

test("reduced motion explains the static cover; keyboard opt-in follows the audio", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith("morph.mp4")) requests.push(r.url());
  });
  await open(page);
  await expect(cover(page)).toContainText("Movimento reduzido: capa estática");
  await toggle(page, "cover");
  await progress(page).fill("13");
  await toggle(page);
  expect(requests).toEqual([]);
  expect(await calls(page)).toBe(0);
  await expect(poster(page)).toHaveCSS("opacity", "1");
  const enable = page.getByRole("button", { name: "Ativar animação", exact: true });
  await enable.focus();
  await expect(enable).toBeFocused();
  await enable.press("Enter");
  await expect.poll(() => drift(page)).toBeLessThan(0.04);
  await expect(poster(page)).toHaveCSS("opacity", "0");
  await expect(page.locator("video")).toHaveJSProperty("paused", true);
  await toggle(page);
  await expect(cover(page)).toHaveAttribute("data-animation-state", "playing");
  await page.getByRole("button", { name: "Desativar animação", exact: true }).click();
  await expect(page.locator("video")).toHaveJSProperty("paused", true);
  await expect(poster(page)).toHaveCSS("opacity", "1");
  await expect.poll(() => audioTime(page)).toBeGreaterThan(13);
});

test("motion opt-in fits 360px with 200% text in both states", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  for (const name of ["Ativar animação", "Desativar animação"]) {
    const control = page.getByRole("button", { name, exact: true });
    const rect = await control.boundingBox();
    const play = await button(page, "cover").boundingBox();
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(play!.x);
    expect(rect!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await control.click();
  }
});

test("dynamic reduced motion stops video; explicit opt-in catches up", async ({ page }) => {
  await open(page);
  await progress(page).fill("13");
  await toggle(page);
  await expect(cover(page)).toHaveAttribute("data-animation-state", "playing");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(poster(page)).toHaveCSS("opacity", "1");
  await expect(page.locator("video")).toHaveJSProperty("paused", true);
  await page.getByRole("button", { name: "Ativar animação", exact: true }).click();
  await expect.poll(() => drift(page)).toBeLessThan(0.15);
  await expect(poster(page)).toHaveCSS("opacity", "0");
});

test("slow video catches up to audio instead of starting at zero", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/media/siga-rota-morph.mp4", async (route) => {
    await gate;
    await route.continue();
  });
  await open(page);
  try {
    await toggle(page);
    await progress(page).fill("14");
    await expect.poll(() => audioTime(page)).toBeGreaterThan(14.3);
    await expect(poster(page)).toHaveCSS("opacity", "1");
    await expect(cover(page)).toHaveAttribute("data-animation-state", "loading");
    release();
    await expect(cover(page)).toHaveAttribute("data-animation-state", "playing");
    await expect.poll(() => drift(page)).toBeLessThan(0.15);
    await expect(poster(page)).toHaveCSS("opacity", "0");
  } finally {
    release();
  }
});

test("paused seek reveals a decoded frame without video frame callbacks", async ({ page }) => {
  await page.addInitScript(() => {
    HTMLVideoElement.prototype.requestVideoFrameCallback = () => 1;
  });
  await open(page);
  await progress(page).fill("15");
  await expect.poll(() => videoTime(page)).toBeCloseTo(3, 1);
  await expect(poster(page)).toHaveCSS("opacity", "0");
  await expect(page.locator("video")).toHaveJSProperty("paused", true);
});

for (const location of ["cover", "dock"] as const) {
  test(`${location}: rejected audio leaves the cover stopped`, async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        return this instanceof HTMLAudioElement
          ? Promise.reject(new DOMException("Blocked", "NotAllowedError"))
          : original.call(this);
      };
    });
    await open(page);
    await toggle(page, location);
    await expect(page.getByRole("alert")).toContainText("bloqueou");
    expect(await calls(page)).toBe(0);
    await expect(poster(page)).toHaveCSS("opacity", "1");
  });
}

for (const mode of ["404", "reject", "throw"] as const) {
  test(`video ${mode}: poster fallback, independent audio, retry at the correct time`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    if (mode === "404")
      await page.route("**/media/siga-rota-morph.mp4", (route) =>
        route.fulfill({ status: 404, body: "Not found" }),
      );
    else
      await page.addInitScript((mode) => {
        const original = HTMLMediaElement.prototype.play;
        let once = true;
        HTMLMediaElement.prototype.play = function () {
          if (this instanceof HTMLVideoElement && once) {
            once = false;
            const error = new DOMException("Blocked", "NotAllowedError");
            if (mode === "throw") throw error;
            return Promise.reject(error);
          }
          return original.call(this);
        };
      }, mode);
    await open(page);
    await progress(page).fill("13");
    await toggle(page);
    await expect(cover(page)).toHaveAttribute("data-animation-state", "error");
    await expect.poll(() => audioTime(page)).toBeGreaterThan(13.3);
    await expect(poster(page)).toHaveCSS("opacity", "1");
    if (mode === "404") await page.unroute("**/media/siga-rota-morph.mp4");
    await toggle(page);
    await toggle(page, "cover");
    await expect(cover(page)).toHaveAttribute("data-animation-state", "playing");
    await expect.poll(() => drift(page)).toBeLessThan(0.15);
    expect(errors).toEqual([]);
  });
}

test("missing final image retains the decoded final video frame", async ({ page }) => {
  await page.route("**/media/siga-rota-morph-last.webp", (route) =>
    route.fulfill({ status: 404, body: "Not found" }),
  );
  await open(page);
  await progress(page).fill("40");
  await expect.poll(() => videoTime(page)).toBeCloseTo(6, 1);
  await expect(poster(page)).toHaveCSS("opacity", "0");
  await expect(finalPoster(page)).toHaveCSS("opacity", "0");
  await expect(cover(page)).toHaveAttribute("data-animation-state", "ended");
});

test("selecting a lyric maps the cover and keeps lyrics scrolling", async ({ page }) => {
  await open(page);
  await page
    .getByRole("button", { name: "O fogo avança, mas não se assusta", exact: true })
    .click();
  await expect(cover(page)).toHaveAttribute("data-animation-state", "playing");
  await expect.poll(() => drift(page)).toBeLessThan(0.15);
  await expect(page.locator('[aria-current="true"]')).toHaveText(
    "O fogo avança, mas não se assusta",
  );
  await expect
    .poll(() => page.locator(".lyrics-mask").evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
});

test("manual final tick holds the emblem; button restart restores the intro", async ({ page }) => {
  await open(page);
  await toggle(page);
  await progress(page).fill((Math.floor((await duration(page)) * 100) / 100).toFixed(2));
  await expect(page.locator("audio")).toHaveJSProperty("ended", true);
  await expect(finalPoster(page)).toHaveCSS("opacity", "1");
  await toggle(page);
  await expect.poll(() => audioTime(page)).toBeLessThan(2);
  await expect(poster(page)).toHaveCSS("opacity", "1");
  expect(await videoTime(page)).toBe(0);
});
for (const [width, height, scale] of [
  [360, 800, 100],
  [390, 844, 100],
  [768, 1024, 100],
  [1440, 1000, 100],
  [360, 800, 200],
]) {
  test(`layout at ${width}px / text ${scale}%`, async ({ page }) => {
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
    await button(page, "cover").scrollIntoViewIfNeeded();
    await expect(button(page, "cover")).toBeInViewport();
    if (scale === 100 && (width === 360 || width === 1440)) {
      await page.screenshot({ path: `artifacts/timeline-${width}-poster.png`, fullPage: true });
      await progress(page).fill("18");
      await expect(cover(page)).toHaveAttribute("data-animation-state", "ended", {
        timeout: 10_000,
      });
      await page.screenshot({ path: `artifacts/timeline-${width}-ended.png`, fullPage: true });
    }
  });
}

test("SSR and bundled video range requests remain available", async ({ request }) => {
  const home = await request.get("/");
  expect(home.status()).toBe(200);
  expect(await home.text()).toContain("morph-first.webp");
  const response = await request.get("/media/siga-rota-morph.mp4", {
    headers: { Range: "bytes=0-1023" },
  });
  expect(response.status()).toBe(206);
  expect(response.headers()["content-range"]).toBe("bytes 0-1023/2563643");
});
