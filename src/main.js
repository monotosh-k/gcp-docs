import puppeteer from 'puppeteer';
import fs from 'fs';
import cheerio from 'cheerio';
import _ from 'underscore';
import getHrefs from 'get-hrefs';
import PDFMerge from 'pdf-merge';
import {
    promisify
} from 'util';
import chalk from 'chalk';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

async function saveNavLinks(options) {
    const url = `https://cloud.google.com/${options.product}/docs/${options.subProduct}`;
    let browser;
    let product = {
        'name': options.product
    };
    try {
        const pathToOutputJson = __dirname + '/../output/products.json';

        browser = await puppeteer.launch();
        const page = await browser.newPage();
        const response = await page.goto(url);
        if (!response.ok()) {
            console.error(`${chalk.red.bold('ERROR')} No GCP product for ${options.product}`);
            return product;
        }
        const buffer = await response.buffer();
        const html = buffer.toString('utf8');

        let $ = cheerio.load(html);
        let links = _.uniq(_.reject(getHrefs($('ul.devsite-nav-expandable').html()), (o) => {
            return o.indexOf('cloud.google.com') < 0 ||
                o.indexOf('ref') > 0;
        }));
        console.log(`Found ${links.length} links`);

        product.links = links;
        product.count = links.length;

        let data = await readFile(pathToOutputJson, 'utf8');
        let jsonData = JSON.parse(data);
        let existing = _.find(jsonData.products, (a) => {
            return a.name === options.product
        });
        if (existing) {
            existing.links = product.links;
            existing.count = product.count;
        } else {
            jsonData.products.push(product);
        }

        await writeFile(pathToOutputJson, JSON.stringify(jsonData));
        return product;

    } catch (err) {
        console.error('%s Failed to get links', chalk.red.bold('ERROR'));
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

async function downloadAndMergePdf(options) {
    let browser;
    try {
        const cookies = [{
            'name': 'devsite_tabbar_last',
            'value': `code-sample:${options.code}`,
            'domain': 'cloud.google.com',
            'path': '/'
        }];
        const pathToOutputJson = __dirname + '/../output/products.json';
        let data = await readFile(pathToOutputJson, 'utf8');
        let jsonData = JSON.parse(data);
        let existing = _.find(jsonData.products, (a) => {
            return a.name === options.product
        });
        if (!existing || !existing.links) {
            console.error(`${chalk.red.bold('ERROR')} No links found`);
        }

        if (!fs.existsSync(`${options.pathToSave}/${options.product}`)) {
            fs.mkdirSync(`${options.pathToSave}/${options.product}`);
        }

        browser = await puppeteer.launch();
        let files = [],
            indx = 0;
        for (const element of existing.links) {
            let urlParts = element.split("/");

            let pathToSave = `${options.pathToSave}/${options.product}/${indx}-${urlParts[urlParts.length - 1]}.pdf`;

            files.push(__dirname + `\\${options.pathToSave}\\${options.product}\\${indx}-${urlParts[urlParts.length - 1]}.pdf`);
            indx++;

            const page = await browser.newPage();
            await page.goto(element, {
                timeout: 0,
                waitUntil: "networkidle0"
            });
            await page.setCookie(...cookies);
            await page.pdf({
                path: pathToSave,
                format: 'Letter',
                scale: 0.8
            });
            await page.close();
            if (indx === existing.links.length) {
                await PDFMerge(files, {
                    output: `${__dirname}\\${options.pathToSave}\\${options.product}\\${options.fileName}`
                });
                console.log(chalk.green.bold('SUCCESS!!'));
                process.exit(1);
            }
        }
    } catch (err) {
        console.error(`${chalk.red.bold('ERROR')}  ${err}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}


export async function downloadDocs(options) {
    try {
        await saveNavLinks(options);
        await downloadAndMergePdf(options);
    } catch (err) {
        console.log(err);
    }
}