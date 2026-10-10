import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "parallel" });

for (const mobile of [false, true]) {
  test.describe(mobile ? "mobile 360px touch" : "desktop 1440px", () => {
    test.use({
      viewport: { width: mobile ? 360 : 1440, height: 900 },
      isMobile: mobile,
      hasTouch: mobile,
    });
    test("full track at normal speed, natural loop, and second 12-second cue", async ({ page }) => {
      test.setTimeout(230_000);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/");
      await page.evaluate(() => {
        const audio = document.querySelector("audio")!;
        const video = document.querySelector("video")!;
        const result = {
          loops: 0,
          starts: [] as Array<{ audio: number; video: number }>,
          maxDrift: 0,
          unexpectedRewinds: 0,
        };
        Object.assign(window, { fullPlayback: result });
        audio.addEventListener("ended", () => {
          result.loops += 1;
        });
        let previousTime = 0;
        video.addEventListener("playing", () => {
          // Buffering/seeking can emit playing again within the same run.
          if (result.starts.length <= result.loops)
            result.starts.push({ audio: audio.currentTime, video: video.currentTime });
        });
        audio.addEventListener("lyric-clock", () => {
          if (audio.currentTime >= 12 && video.currentTime < previousTime - 0.5)
            result.unexpectedRewinds += 1;
          previousTime = video.currentTime;
        });
        audio.addEventListener("timeupdate", () => {
          if (audio.currentTime > 12.3 && audio.currentTime < 17.7 && !video.seeking) {
            result.maxDrift = Math.max(
              result.maxDrift,
              Math.abs(video.currentTime - (audio.currentTime - 12)),
            );
          }
        });
      });
      const controls = page.locator(mobile ? ".player-dock" : ".animated-cover-actions");
      const first = page.locator('img[src$="morph-first.webp"]');
      const last = page.locator('img[src$="morph-last.webp"]');
      const time = () => page.locator("audio").evaluate((el: HTMLAudioElement) => el.currentTime);
      const result = () =>
        page.evaluate(
          () =>
            (
              window as unknown as {
                fullPlayback: {
                  loops: number;
                  starts: Array<{ audio: number; video: number }>;
                  maxDrift: number;
                  unexpectedRewinds: number;
                };
              }
            ).fullPlayback,
        );
      await controls.getByRole("button", { name: "Reproduzir", exact: true }).click();
      await expect.poll(time, { timeout: 15_000 }).toBeGreaterThan(10.8);
      await expect(first).toHaveCSS("opacity", "1");
      await expect(page.locator("video")).toHaveJSProperty("paused", true);
      expect((await result()).starts).toHaveLength(0);
      await expect.poll(time).toBeGreaterThan(13.2);
      await expect(first).toHaveCSS("opacity", "0");
      await expect(page.locator(".animated-cover")).toHaveAttribute(
        "data-animation-state",
        "playing",
      );
      // Save the actual intermediate morph, rather than just its static end image.
      await page
        .locator(".animated-cover-media")
        .screenshot({ path: `artifacts/timeline-${mobile ? 360 : 1440}-moving.png` });
      await expect(last).toHaveCSS("opacity", "1", { timeout: 8_000 });
      expect((await result()).starts).toHaveLength(1);
      await expect
        .poll(async () => (await result()).loops, { timeout: 165_000, intervals: [500] })
        .toBe(1);
      await expect(first).toHaveCSS("opacity", "1");
      await expect.poll(time).toBeLessThan(2);
      await expect(page.locator('[aria-current="true"]')).toHaveText("♪");
      expect((await result()).starts).toHaveLength(1);
      await expect.poll(time, { timeout: 15_000 }).toBeGreaterThan(10.8);
      await expect(first).toHaveCSS("opacity", "1");
      await expect.poll(async () => (await result()).starts.length).toBe(2);
      const metrics = await result();
      for (const start of metrics.starts) {
        expect(start.audio).toBeGreaterThanOrEqual(12);
        expect(start.audio).toBeLessThan(12.4);
        expect(start.video).toBeLessThan(0.4);
      }
      expect(metrics.maxDrift).toBeLessThan(0.2);
      expect(metrics.unexpectedRewinds).toBe(0);
      expect(errors).toEqual([]);
      await test.info().attach("full-playback-metrics", {
        body: JSON.stringify(metrics, null, 2),
        contentType: "application/json",
      });
      await page
        .locator(".player-dock")
        .getByRole("button", { name: "Pausar", exact: true })
        .click();
    });
  });
}
