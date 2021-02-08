const puppeteer = require('puppeteer');
const readline = require('readline');

const delay = ms => new Promise(res => setTimeout(res, ms));

var args = process.argv.slice(2);
const dealabs_page = args[0];
const email = args[1];
const password = args[2];

const width = 1000;
const height = 800;

async function getLinks(page) {
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

async function connect(page) {
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

async function getCourse(page, link) {
    await page.setViewport({width: width, height: height});  
    await page.goto(link, {waitUntil: 'networkidle2'});

    // Check if Free
    try {
        const value =  await page.$eval('div.price-text--price-part--Tu6MH.udlite-clp-discount-price.udlite-heading-xxl > span:nth-child(2)',
            el => el.innerText);
        if (value != "Free" && value != "Gratuit") {
            console.log("course is not free (%s): %s", value, link);
            return;
        }
    } catch {
        console.log("Unable to find add cart button. The course must be already bought: %s", link);
        return;
    }

    // Add to cart
    try {
        await page.evaluate(() => {
            document.querySelector('button.add-to-cart').click();
        });
    } catch {
        console.log("Cannot add to cart: %s", link);
        return;
    }
    page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    // Wait to be sure that the coupon has been applied
    await delay(5000);

    // Go to cart
    await page.goto('https://www.udemy.com/cart/', {waitUntil: 'networkidle2'});

    // Validate cart
    try {
        await page.evaluate(() => {
            document.querySelector("button[data-purpose=\"shopping-cart-checkout\"]").click();
        });
    } catch {
        console.log("Cannot validate cart: %s", link);
        return;
    }
    page.waitForNavigation({ waitUntil: 'networkidle2' });

    // Enroll
    await delay(3000); // Wait for button to be ready (unknown readon)
    try {
        await page.evaluate(() => {
            document.querySelector("button[type=\"submit\"]").click();
        });
    } catch {
        console.log("Cannot enroll: %s", link);
        return;
    }
    page.waitForNavigation({ waitUntil: 'networkidle2' });

    console.log("Done for %s", link);
    await delay(5000); // Watch the result page before closing
}

async function main() {
    console.log(dealabs_page);
    console.log("It will use these credentials: %s (%s)", email, password);
    await askQuestion("Press enter if it's ok, Ctrl-C otherwise.");

    // Create a browser and welcome page
    const browser = await puppeteer.launch({
        defaultViewport: null,
        headless: false, // The browser is visible
        ignoreHTTPSErrors: true,
        args: [`--window-size=${width},${height}`] // new option
    });
    const page = (await browser.pages())[0];

    // Connect to udemy
    await connect(page);

    // Get link
    var links = await getLinks(page);

    // Get free courses
    for (let link of links) {
        await getCourse(page, link);
    }

    console.log("All links have been analysed.");
    browser.close();
}

main();
