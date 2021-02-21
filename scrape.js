const puppeteer = require('puppeteer'); 
const readline = require('readline');

const delay = ms => new Promise(res => setTimeout(res, ms));

var args = process.argv.slice(2);
const dealabs_page = args[0];
const email = args[1];
const password = args[2];
const wsChromeEndpointurl = args[3];

const width = 1000;
const height = 800;
const pageDisplayDelay = 3000;

async function getLinks(page) {
    await page.setViewport({width: width, height: height});    
    await page.goto(dealabs_page, {waitUntil: 'networkidle2'});
    
    var links = new Array();

    const elements = await page.$$("a");
    for (let element of elements) {
        const title = await page.evaluate(e => e.getAttribute("title"), element);
        if (title != null && (title.includes('udemy.com') || title.includes('chollometro.com'))) {
            links.push(title);
        }
    }

    return links
}

async function getCourse(page, link) {
    await page.setViewport({width: width, height: height});  
    await page.goto(link, {waitUntil: 'networkidle2'}).catch(function () {
        console.log("The page must has been redirected");
   });
   ;

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
    await delay(pageDisplayDelay);

    // Go to cart
    await page.goto('https://www.udemy.com/cart/checkout', {waitUntil: 'networkidle2'});

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

    // Wait for button to be ready (unknown reason)
    await delay(pageDisplayDelay); 

    // Be sure that the cart is free 
    try {
        const value =  await page.$eval('p.mb-space-sm',
            el => el.innerText);
        if (value != "Your cart is free!") {
            console.log("Error: cart is not free (%s): %s", value, link);
            return;
        }
    } catch {
        console.log("Error when checking that the cart is free: %s", link);
        return;
    }

    // Enroll
    try {
        await page.evaluate(() => {
            document.querySelector(".styles--checkout-pane-outer--1syWc > div:nth-child(1) > div:nth-child(4) > button:nth-child(2)").click();
        });
    } catch {
        console.log("Cannot enroll: %s", link);
        return;
    }
    page.waitForNavigation({ waitUntil: 'networkidle2' });

    console.log("Done for %s", link);
}

async function main() {
    // Get existing browser
    const browser = await puppeteer.connect({
        browserWSEndpoint: wsChromeEndpointurl,
    });
    const page = (await browser.pages())[0];

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
