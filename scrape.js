const puppeteer = require('puppeteer');
const readline = require('readline');

const dealabs_page = "https://www.dealabs.com/bons-plans/selection-de-cours-en-ligne-gratuits-dematerialises-en-anglais-ex-the-complete-android-ethical-hacking-practical-course-caehp-2087273"
const width = 1000;
const height = 800;
const email = "louis.fradin@gmail.com";

async function getLinks(browser) {
    const page = await browser.newPage();
    await page.setViewport({width: width, height: height});    
    await page.goto(dealabs_page, {waitUntil: 'networkidle2'});
    
    var links = new Array();

    const elements = await page.$$("a");
    for (let element of elements) {
        const title = await page.evaluate(e => e.getAttribute("title"), element);
        if (title != null && title.includes('udemy.com') && title.includes('couponCode')) {
            links.push(title);
        }
    }

    return links
}

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
}

async function connect(browser) {
    const page = (await browser.pages())[0];
    await page.setViewport({width: width, height: height});  
    await page.goto('https://www.udemy.com/join/login-popup/', {waitUntil: 'networkidle2'});

    await page.$eval('#email--1',
        el => el.value = "louis.fradin@gmail.com");
        // el => el.value = "oceane.guerecheau@gmail.com");

    await askQuestion("Press enter when you have successfully logged in.");
}

async function getCourse(browser, link) {
    const page = await browser.newPage();
    await page.setViewport({width: width, height: height});  
    await page.goto(link, {waitUntil: 'networkidle2'});

    // Check if Free
    try {
        const value =  await page.$eval('div.price-text--price-part--Tu6MH.udlite-clp-discount-price.udlite-heading-xxl > span:nth-child(2)',
            el => el.innerText);
        if (value != "FREE" && value != "Gratuit") {
            console.log("course %s is not free", link);
            return;
        }
    } catch {
        console.log("Unable to find add cart button. The course must be already bought.");
        return;
    }

    // Add to cart
    button = await page.waitForSelector('div.buy-box--buy-box-item--1Qbkl.buy-box--add-to-cart-button--u5kCJ > div > button', { visibility: true});
    await button.click();
    page.waitForNavigation({ waitUntil: 'networkidle0' });

    // Go to cart
    button = await page.waitForSelector('div.styles--course-added--aJk4C > div.styles--added-context--1Xdgf > button', { visible: true });
    await button.click();
    page.waitForNavigation({ waitUntil: 'networkidle0' });

    // Validate cart
    button = await page.waitForSelector('div.styles--sc-checkout-pane--71SP_.styles--sc-checkout-pane--vertical--1Z5xx > div:nth-child(3) > button', { visible: true });
    await button.click();
    page.waitForNavigation({ waitUntil: 'networkidle0' });

    // Enroll
    button = await page.waitForSelector('div.styles--button-slider--2IGed.styles--checkout-slider--1ry4z > button', { visible: true });
    await button.click();
    page.waitForNavigation({ waitUntil: 'networkidle0' });
}

async function main() {
    const browser = await puppeteer.launch({
        defaultViewport: null,
        headless: false, // The browser is visible
        ignoreHTTPSErrors: true,
        args: [`--window-size=${width},${height}`] // new option
    });

    // Connect to udemy
    await connect(browser);

    // Get link
    var links = await getLinks(browser);

    // Get free courses
    // getCourse(browser, "https://www.udemy.com/course/startup-fast-track-confident-launch-in-90-days-or-less/?couponCode=JAN2021");
    for (let link of links) {
        await getCourse(browser, link);
    }

    // browser.close();
}

main();