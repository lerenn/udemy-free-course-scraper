const puppeteer = require('puppeteer');
const readline = require('readline');

const delay = ms => new Promise(res => setTimeout(res, ms));

var args = process.argv.slice(2);
const dealabs_page = args[0];
const email = args[1];
const password = args[2];

const width = 1000;
const height = 800;

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

    // Add credentials
    await page.$eval('#email--1',
        (el, value) => el.value = value, email);
    await page.$eval('#id_password',
        (el, value) => el.value = value, password);

    // Login
    button = await page.waitForSelector('#submit-id-submit', { visibility: true});
    await button.click();
    page.waitForNavigation({ waitUntil: 'networkidle2' });

    await delay(5000);
}

async function getCourse(browser, link) {
    const page = await browser.newPage();
    await page.setViewport({width: width, height: height});  
    await page.goto(link, {waitUntil: 'networkidle2'});

    // Check if Free
    try {
        const value =  await page.$eval('div.price-text--price-part--Tu6MH.udlite-clp-discount-price.udlite-heading-xxl > span:nth-child(2)',
            el => el.innerText);
        if (value != "Free" && value != "Gratuit") {
            console.log("course %s is not free (%s)", link, value);
            return;
        }
    } catch {
        console.log("Unable to find add cart button. The course must be already bought.");
        return;
    }

    // Add to cart
    // selector = '#udemy > div.main-content-wrapper > div.main-content > div.paid-course-landing-page__container > div.top-container.dark-background > div > div > div.course-landing-page__main-content.course-landing-page__purchase-section__main.dark-background-inner-text-container > div > div > div > div > div.generic-purchase-section--buy-box-main--siIXV > div > div.buy-box--buy-box-item--1Qbkl.buy-box--add-to-cart-button--u5kCJ > div > button';
    selector = 'div.main-content-wrapper > div.main-content > div.paid-course-landing-page__container > div.top-container.dark-background > div > div > div.course-landing-page__main-content.course-landing-page__purchase-section__main.dark-background-inner-text-container > div > div > div > div > div.generic-purchase-section--buy-box-main--siIXV > div > div.buy-box--buy-box-item--1Qbkl.buy-box--add-to-cart-button--u5kCJ > div > button';
    try {
        button = await page.waitForSelector(selector, { visibility: true});
    } catch {
        console.log("Cannot add to cart course %s", link);
        return;
    }
    await button.click();
    page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    // Wait to be sure that the coupon has been applied
    await delay(5000);

    // Go to cart
    await page.goto('https://www.udemy.com/cart/', {waitUntil: 'networkidle2'});

    // Validate cart
    // selector = '#udemy > div.main-content-wrapper > div.main-content > div > div > div > div.container.styles--shopping-container--1aPCP > div.styles--sc-checkout-pane--71SP_.styles--sc-checkout-pane--vertical--1Z5xx > div:nth-child(3) > button';
    selector = 'div.main-content-wrapper > div.main-content > div > div > div > div.container.styles--shopping-container--1aPCP > div.styles--sc-checkout-pane--71SP_.styles--sc-checkout-pane--vertical--1Z5xx > div:nth-child(3) > button';
    try {
        button = await page.waitForSelector(selector, { visibility: true});
    } catch {
        console.log("Cannot validate cart on course %s", link);
        return;
    }
    await button.click();
    page.waitForNavigation({ waitUntil: 'networkidle2' });

    // Enroll
    await delay(5000); // Wait for button to be ready (unknown readon)
    // selector = '#udemy > div.main-content-wrapper > div.main-content > div > div > div > div.container.styles--shopping-container--A136v > form > div.styles--checkout-pane-outer--1syWc > div > div.styles--button-slider--2IGed.styles--checkout-slider--1ry4z > button';
    selector = 'div.main-content-wrapper > div.main-content > div > div > div > div.container.styles--shopping-container--A136v > form > div.styles--checkout-pane-outer--1syWc > div > div.styles--button-slider--2IGed.styles--checkout-slider--1ry4z > button';
    try {
        button = await page.waitForSelector(selector, { visibility: true});
    } catch {
        console.log("Cannot enroll on course %s", link);
        return;
    }
    await button.click();
    page.waitForNavigation({ waitUntil: 'networkidle2' });

    console.log("Done for %s", link);
    await delay(10000); // Watch the result page before closing
    page.close();
}

async function main() {
    console.log(dealabs_page);
    console.log("It will use these credentials: %s (%s)", email, password);
    await askQuestion("Press enter if it's ok, Ctrl-C otherwise.");

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
    for (let link of links) {
        await getCourse(browser, link);
    }

    // browser.close();
}

main();