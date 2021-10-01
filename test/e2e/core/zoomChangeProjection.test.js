const playwright = require("playwright");
const { browsers } = require("../../../jest-playwright.config");
jest.setTimeout(50000);
(async () => {
  for (const browserType of browsers) {
    describe(
      "Playwright zoomin zoomout Projection Change Tests in " + browserType,
      () => {
        beforeAll(async () => {
          await page.goto(PATH + "zoomChangeProjection.html");
        });

        test("[" + browserType + "]" + " zoomin link changes projections", async () => {
          await page.click("div > div.leaflet-control-container > div.leaflet-top.leaflet-left > div.leaflet-control-zoom.leaflet-bar.leaflet-control > a.leaflet-control-zoom-in");
          await page.waitForTimeout(1000);
          const newProjection = await page.$eval(
            'body > map',
            (map) => map.projection
          );
          const layerValid = await page.$eval(
            'body > map > layer-',
            (layer) => !layer.hasAttribute('disabled')
          )
          expect(newProjection).toEqual("OSMTILE");
          expect(layerValid).toEqual(true);
        });

        test("[" + browserType + "]" + " zoomout link changes projections", async () => {
          await page.click("div > div.leaflet-control-container > div.leaflet-top.leaflet-left > div.leaflet-control-zoom.leaflet-bar.leaflet-control > a.leaflet-control-zoom-out");
          await page.waitForTimeout(1000);
          const newProjection = await page.$eval(
            'body > map',
            (map) => map.projection
          );
          const layerValid = await page.$eval(
            'body > map > layer-',
            (layer) => !layer.hasAttribute('disabled')
          )
          expect(newProjection).toEqual("CBMTILE");
          expect(layerValid).toEqual(true);
        });
      }
    );
  }
})();