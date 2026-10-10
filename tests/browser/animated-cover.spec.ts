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

for (const location of ["cover", "dock"] as const) {
  test(`${location} starts once; other button freezes the frame and resumes from zero`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await open(page);
    await toggle(page, location);
    await expect.poll(() => videoTime(page)).toBeGreaterThan(1.2);
    await expect.poll(() => audioTime(page)).toBeGreaterThan(1);
    expect(await calls(page)).toBe(1);
    const other = location === "cover" ? "dock" : "cover";
    await toggle(page, other);
    await expect(cover(page)).toHaveAttribute("data-animation-state", "paused");
    await expect(page.locator("video")).toHaveJSProperty("paused", true);
    const frozenAt = await videoTime(page);
    const audioAt = await audioTime(page);
    const frame = await page.locator(".animated-cover-media").screenshot();
    await page.waitForTimeout(400); // Observe a frozen frame over wall time.
    expect(await videoTime(page)).toBe(frozenAt);
    expect(await audioTime(page)).toBe(audioAt);
    expect((await page.locator(".animated-cover-media").screenshot()).equals(frame)).toBe(true);
    await toggle(page, other);
    await expect(cover(page)).toHaveAttribute("data-animation-state", "playing");
    expect(await videoTime(page)).toBeLessThan(1);
    expect(await calls(page)).toBe(2);
    await expect.poll(() => audioTime(page)).toBeGreaterThan(audioAt + 0.1);
    await toggle(page, location);
    await expect(cover(page)).toHaveAttribute("data-animation-state", "paused");
    expect(errors).toEqual([]);
  });
}

test("header icon is removed and text aligns with the header", async ({ page }) => {
  await open(page);
  const header = page.locator("header");
  await expect(header).toContainText("Técnico de Segurança do Trabalho");
  await expect(header.locator("svg")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Rever animação" })).toHaveCount(0);
  expect(
    await header.evaluate((el) =>
      Math.abs(
        el.querySelector("span")!.getBoundingClientRect().left - el.getBoundingClientRect().left,
      ),
    ),
  ).toBeLessThan(1);
});

test("poster is shared and video is not downloaded before a valid play", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("siga-rota-morph")) requests.push(r.url());
  });
  await open(page);
  await expect(poster(page)).toHaveCSS("opacity", "1");
  expect(requests.filter((url) => url.endsWith("morph.mp4"))).toHaveLength(0);
  expect(requests.filter((url) => url.endsWith("morph-first.webp"))).toHaveLength(1);
  for (const [property, value] of [
    ["muted", true],
    ["playsInline", true],
    ["loop", false],
    ["controls", false],
  ] as const) {
    await expect(page.locator("video")).toHaveJSProperty(property, value);
  }
});

test("animation ends once and each natural audio loop starts exactly one new run", async ({
  page,
}) => {
  await open(page);
  await toggle(page);
  await expect(cover(page)).toHaveAttribute("data-animation-state", "ended", { timeout: 10_000 });
  await expect(finalPoster(page)).toHaveCSS("opacity", "1");
  expect(await videoTime(page)).toBeCloseTo(6, 1);
  await page.waitForTimeout(400);
  expect(await calls(page)).toBe(1);
  for (const expectedCalls of [2, 3]) {
    await progress(page).fill(((await duration(page)) - 0.4).toFixed(2));
    await expect.poll(() => calls(page)).toBe(expectedCalls);
    await expect.poll(() => audioTime(page)).toBeLessThan(2);
    await expect(cover(page)).toHaveAttribute("data-animation-state", "playing");
    expect(await videoTime(page)).toBeLessThan(2);
    await expect(page.locator('[aria-current="true"]')).toHaveText("♪");
  }
});

test("manual zero, forward/back and paused seeking do not restart the animation", async ({
  page,
}) => {
  await open(page);
  await toggle(page);
  await expect.poll(() => videoTime(page)).toBeGreaterThan(1);
  await progress(page).fill("60");
  await expect(page.locator('[aria-current="true"]')).toHaveText(
    "Líquido inflamável, tome cuidado",
  );
  await progress(page).fill("0");
  await dock(page).getByRole("button", { name: "Avançar 10 segundos" }).click();
  await dock(page).getByRole("button", { name: "Voltar 10 segundos" }).click();
  expect(await calls(page)).toBe(1);
  expect(await videoTime(page)).toBeGreaterThan(1);
  await toggle(page);
  const frozen = await videoTime(page);
  await progress(page).fill("80");
  await expect(page.locator('[aria-current="true"]')).toHaveText("Então, me ajude a acionar");
  expect(await calls(page)).toBe(1);
  expect(await videoTime(page)).toBe(frozen);
});

test("jumping to the final slider tick is not classified as a natural loop", async ({ page }) => {
  await open(page);
  await toggle(page);
  await expect.poll(() => videoTime(page)).toBeGreaterThan(0.3);
  await progress(page).fill((Math.floor((await duration(page)) * 100) / 100).toFixed(2));
  await expect(page.locator("audio")).toHaveJSProperty("ended", true);
  await expect(cover(page)).toHaveAttribute("data-animation-state", "paused");
  expect(await calls(page)).toBe(1);
  await toggle(page, "cover");
  await expect.poll(() => calls(page)).toBe(2);
  await expect.poll(() => audioTime(page)).toBeLessThan(2);
});

test("verse selection plays audio and scrolls lyrics without starting animation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page);
  await page
    .getByRole("button", { name: "No quadro de energia, perigo no ar", exact: true })
    .click();
  await expect(page.locator('[aria-current="true"]')).toHaveText(
    "No quadro de energia, perigo no ar",
  );
  await expect.poll(() => audioTime(page)).toBeGreaterThan(115.2);
  expect(await calls(page)).toBe(0);
  await expect(cover(page)).toHaveAttribute("data-animation-state", "idle");
  await expect
    .poll(() =>
      page.locator(".lyrics-mask").evaluate((el) => {
        const line = el.querySelector('[aria-current="true"]')!.getBoundingClientRect();
        const viewport = el.getBoundingClientRect();
        return Math.abs((line.top + line.bottom) / 2 - (viewport.top + viewport.bottom) / 2);
      }),
    )
    .toBeLessThan(10);
});

test("reduced motion keeps static art for both buttons and loop with keyboard access", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith("morph.mp4")) requests.push(r.url());
  });
  await open(page);
  await page.keyboard.press("Tab");
  await expect(button(page, "cover")).toBeFocused();
  expect(
    await button(page, "cover").evaluate((el) => {
      const style = getComputedStyle(el);
      return parseFloat(style.outlineWidth) > 0 || style.boxShadow !== "none";
    }),
  ).toBe(true);
  await button(page, "cover").press("Enter");
  await expect.poll(() => audioTime(page)).toBeGreaterThan(0.2);
  await toggle(page);
  await toggle(page);
  await progress(page).fill(((await duration(page)) - 0.4).toFixed(2));
  await expect.poll(() => audioTime(page)).toBeLessThan(2);
  expect(await calls(page)).toBe(0);
  expect(requests).toEqual([]);
  await expect(poster(page)).toHaveCSS("opacity", "1");
});

test("motion preference freezes the frame and waits for the next valid button play", async ({
  page,
}) => {
  await open(page);
  await toggle(page);
  await expect.poll(() => videoTime(page)).toBeGreaterThan(0.5);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(cover(page)).toHaveAttribute("data-animation-state", "paused");
  const frozen = await videoTime(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await progress(page).fill("60");
  expect(await videoTime(page)).toBe(frozen);
  expect(await calls(page)).toBe(1);
  await toggle(page);
  await toggle(page, "cover");
  await expect.poll(() => calls(page)).toBe(2);
});

for (const location of ["cover", "dock"] as const) {
  test(`${location} audio rejection leaves animation stopped`, async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        return this instanceof HTMLAudioElement
          ? Promise.reject(new DOMException("Blocked for test", "NotAllowedError"))
          : original.call(this);
      };
    });
    await open(page);
    await toggle(page, location);
    await expect(page.getByRole("alert")).toContainText("bloqueou");
    expect(await calls(page)).toBe(0);
    await expect(cover(page)).toHaveAttribute("data-animation-state", "idle");
  });
}

test("pending audio waits for playing and rapid second button click cancels the request", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/assets/siga-a-rota.mp3", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(button(page, "cover")).toBeVisible();
  try {
    await toggle(page, "cover");
    await expect(button(page)).toHaveAccessibleName("Pausar");
    expect(await calls(page)).toBe(0);
    await toggle(page);
    release();
    await expect(page.locator("audio")).toHaveJSProperty("paused", true);
    expect(await calls(page)).toBe(0);
    await toggle(page);
    await expect.poll(() => calls(page)).toBe(1);
  } finally {
    release();
  }
});

test("slow video leaves audio independent; pause cancels its pending playback", async ({
  page,
}) => {
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
    await expect.poll(() => audioTime(page)).toBeGreaterThan(0.3);
    await expect(cover(page)).toHaveAttribute("data-animation-state", "loading");
    await progress(page).fill("60");
    await expect(page.locator('[aria-current="true"]')).toHaveText(
      "Líquido inflamável, tome cuidado",
    );
    await toggle(page, "cover");
    release();
    await expect(cover(page)).toHaveAttribute("data-animation-state", "paused");
    await expect(page.locator("video")).toHaveJSProperty("paused", true);
    await expect(poster(page)).toHaveCSS("opacity", "1");
  } finally {
    release();
  }
});

test("video 404 preserves audio and poster and next button play retries", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/media/siga-rota-morph.mp4", (route) =>
    route.fulfill({ status: 404, body: "Not found" }),
  );
  await open(page);
  await toggle(page);
  await expect(cover(page)).toHaveAttribute("data-animation-state", "error");
  await expect.poll(() => audioTime(page)).toBeGreaterThan(0.1);
  await expect(poster(page)).toHaveCSS("opacity", "1");
  await page.unroute("**/media/siga-rota-morph.mp4");
  await toggle(page);
  await toggle(page, "cover");
  await expect(cover(page)).toHaveAttribute("data-animation-state", "playing");
  expect(errors).toEqual([]);
});

for (const mode of ["reject", "throw"] as const) {
  test(`video play ${mode} has no unhandled error and retries on next play`, async ({ page }) => {
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
    await toggle(page);
    await expect(cover(page)).toHaveAttribute("data-animation-state", "error");
    await expect.poll(() => audioTime(page)).toBeGreaterThan(0.2);
    await toggle(page);
    await toggle(page, "cover");
    await expect(cover(page)).toHaveAttribute("data-animation-state", "playing");
    expect(errors).toEqual([]);
  });
}

test("missing final poster retains native final video frame", async ({ page }) => {
  await page.route("**/media/siga-rota-morph-last.webp", (route) =>
    route.fulfill({ status: 404, body: "Not found" }),
  );
  await open(page);
  await toggle(page);
  await expect(cover(page)).toHaveAttribute("data-animation-state", "ended", { timeout: 10_000 });
  await expect(poster(page)).toHaveCSS("opacity", "0");
  await expect(finalPoster(page)).toHaveCSS("opacity", "0");
  await expect(page.locator("video")).toHaveJSProperty("ended", true);
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
      await page.screenshot({ path: `artifacts/sync-${width}-poster.png`, fullPage: true });
      await toggle(page, "cover");
      await expect(cover(page)).toHaveAttribute("data-animation-state", "ended", {
        timeout: 10_000,
      });
      await toggle(page, "cover");
      await page.screenshot({ path: `artifacts/sync-${width}-ended.png`, fullPage: true });
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
