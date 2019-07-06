import puppeteer from 'puppeteer';
import fs from 'fs';
import cheerio from 'cheerio';
import _ from 'underscore';
import getHrefs from 'get-hrefs';
import path from 'path';
//import PDFMerge from 'pdf-merge';
import hummus from 'hummus';
import rimraf from 'rimraf';
import {
    promisify
} from 'util';
import chalk from 'chalk';
// import Listr from 'listr';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

async function saveNavLinks(options) {
    const url = `https://cloud.google.com/${options.product}/docs/${options.subProduct}`;
    let browser;
    let product = {
        'name': options.product
    };
    const pathToOutputJson = path.join(__dirname, '/../output/products.json');

    browser = await puppeteer.launch();
    const page = await browser.newPage();
    const response = await page.goto(url);
    if (!response.ok()) {
        await browser.close();
        throw new Error(`${chalk.red.bold('ERROR')} No GCP product for ${options.product}`);
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
    await browser.close();
    return product;
}

async function downloadAndMergePdf(options) {
    let browser;
    const pathToOutputJson = path.join(__dirname, '/../output/products.json');
    let data = await readFile(pathToOutputJson, 'utf8');
    let jsonData = JSON.parse(data);
    let existing = _.find(jsonData.products, (a) => {
        return a.name === options.product
    });
    if (!existing || !existing.links) {
        await browser.close();
        throw new Error(`${chalk.red.bold('ERROR')} No links found`);
    }

    if (!fs.existsSync(`${options.pathToSave}/${options.product}`)) {
        fs.mkdirSync(`${options.pathToSave}/${options.product}`);
    }

    browser = await puppeteer.launch();
    let files = [],
        indx = 0;

    let promises = [];
    for (const element of existing.links) {
        let urlParts = element.split("/");
        let pathToSave = `${options.pathToSave}/${options.product}/${indx}-${urlParts[urlParts.length - 1]}.pdf`;
        promises.push(downloadSingle(browser, element, pathToSave, options.language));
        indx++;
    }

    let results = await Promise.all(promises);
    for (let result of results) {
        files.push(result);
    }
    
    // await PDFMerge(files, {
    //     output: path.join(options.pathToSave, options.fileName)
    // });

    let pdfwriter = hummus.createWriter(path.join(options.pathToSave, options.fileName));
    files.forEach((file)=>{
        pdfwriter.appendPDFPagesFromPDF(file);
    });
    pdfwriter.end();
    console.log(`${chalk.green.bold('Done')} Saved file at ${path.join(options.pathToSave, options.fileName)}`);
    
    browser.close();

    rimraf(path.join(options.pathToSave, options.product), (err)=>{
        if(err) console.log(err);
    });
}

async function downloadSingle(browser, url, pathToSave, language) {
    try {
        let lanSelectorId = language === "C#" ? language : language.toLowerCase();
        const page = await browser.newPage();
        await page.goto(url, {
            timeout: 0,
            waitUntil: "networkidle0"
        }); 
        // if(!page.$(`h3.kd-tabbutton [kd-data-id="code-sample:${lanSelectorId}"]`)){
        //     console.log(`Found ${lanSelectorId}`);
        //     await page.click(`h3.kd-tabbutton [kd-data-id="code-sample:${lanSelectorId}"]`);
        // }
        
        
        await page.pdf({
            path: pathToSave,
            format: 'Letter',
            scale: 0.8
        });

        await page.close();
        return pathToSave;
    } catch (err) {
        console.log(err);
    }
}



export async function downloadDocs(options) {
    await saveNavLinks(options);
    await downloadAndMergePdf(options);
    // const tasks = new Listr(
    //     [{
    //             title: `Get navigation links for ${options.product}`,
    //             task: () => saveNavLinks(options)
    //         },
    //         {
    //             title: 'Save page as pdf and merge',
    //             task: () => downloadAndMergePdf(options),
    //         }
    //     ], {
    //         exitOnError: true
    //     });
    // await tasks.run();
    return true;
}