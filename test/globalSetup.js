//const playwright = require("playwright");
//import { chromium  } from 'playwright';
//jest.setTimeout(50000);
const { chromium } = require("playwright");

module.exports = async config => {

  console.log("check if it's actually configuring");
  const browser = await chromium.launch({
    headless: false
  });
  //const context = await browser.newContext();
  const page = await browser.newPage();
  await browser.close();
  /*
              browser = await playwright.chromium.launch({
                headless: false,
                slowMo: 50,
              });
              
              context = await browser.newContext();
              page = await context.newPage();
              if (browserType === "firefox") {
                await page.waitForNavigation();
              }
              */
    
};