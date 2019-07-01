
const fs = require('fs');
const getHrefs = require('get-hrefs');
const puppeteer = require('puppeteer');
const shell = require('shelljs');
const PDFMerge = require('pdf-merge');
const Q = require('q');

const scrape = require('website-scraper');
const options = {
    urls: ['https://cloud.google.com/compute/docs/instances/'],
    directory: '/pages/instances.html',
};

const cookies = [{
    'name': 'devsite_tabbar_last',
    'value': 'code-sample:C#',
    'domain': 'cloud.google.com',
    'path': '/'
}];



let download = (browser, product, hrefs) => {
    hrefs.forEach((element, indx) => {

        let urlParts = element.split("/");


        let pathToSave = `./pdf/${product}/${indx}-${urlParts[urlParts.length - 1]}.pdf`;

        files.push(__dirname + `\\pdf\\${product}\\${indx}-${urlParts[urlParts.length - 1]}.pdf`);
        browser.newPage().then((page) => {
            page.goto(element, { timeout: 0, waitUntil: "networkidle0" })
                .then((res) => {
                    page.setCookie(...cookies).then(() => {
                        page.pdf({ path: pathToSave, format: 'Letter', scale: 0.8 })
                            .then(() => {
                                page.close().then(() => {
                                    i++;
                                    console.log(i);
                                    if (i == files.length) {

                                        PDFMerge(files, { output: `${__dirname}\\pdf\\${product}\\${product}.pdf` })
                                            .then((buffer) => {
                                                //process.exit();
                                            }).catch((err) => {
                                                console.log(err);
                                            })
                                    }
                                    console.log(pathToSave);
                                    console.log(files.length);
                                })
                            });
                    })

                }).catch((err) => {
                    console.log(err);
                })
        }).catch((err) => {
            console.log(err);
        });
    })
}
