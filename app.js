const fs = require('fs');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const PDFMerge = require('pdf-merge');
const getHrefs = require('get-hrefs');
const _ = require('underscore');
const cookies = [{
    'name': 'devsite_tabbar_last',
    'value': 'code-sample:C#',
    'domain': 'cloud.google.com',
    'path': '/'
}];

let product = 'compute';
let subproduct = ''
let url = `https://cloud.google.com/${product}/docs/${subproduct}`;

let download = (browser, product, hrefs) => {
    let files = [], 
    i = 0;
    if(!fs.existsSync(`./pdf/${product}`)){
        fs.mkdirSync(`./pdf/${product}`);
    }
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
                                                process.exit();
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

puppeteer.launch()
    .then((browser) => {
        browser.newPage()
            .then((page) => {
                page.goto(url)
                    .then((res) => {
                        res.buffer().then((buffer) => {
                            let html = buffer.toString('utf8');

                            let $ = cheerio.load(html);
                            let links = _.uniq(_.reject(getHrefs($('ul.devsite-nav-expandable').html()), (o) => {
                                return o.indexOf('cloud.google.com') < 0 ||
                                    o.indexOf('ref') > 0;
                            }));
                            console.log(`Found ${links.length} links`);
                            //console.log(links);
                            let p = {
                                'name': product,
                                'links': links,
                                'count': links.length
                            };
                            //console.log((products));
                            fs.readFile('./products.json', 'utf8', (err, data) => {
                                let jsonData = JSON.parse(data);
                                let existing = _.find(jsonData.products, (a) => { return a.name === product });
                                //console.log(existing);
                                if (existing) {
                                    existing.links = p.links;
                                    existing.count = p.count;
                                }
                                else {
                                    jsonData.products.push(p);
                                }

                                fs.writeFile('./products.json', JSON.stringify(jsonData), (err) => {
                                    //console.log(err);
                                    //console.log('Done!!')
                                    //process.exit();
                                    download(browser, product, links);
                                })
                            });
                            page.close();
                        })
                            .catch((err) => {
                                console.log(err);
                            })
                    })
                    .catch((err) => {
                        console.log(err);
                    })
            })
            .catch((err) => {
                console.log(err);
            })
    })
    .catch((err) => {
        console.log(err);
    })