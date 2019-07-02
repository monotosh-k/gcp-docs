import q from 'q';
import puppeteer from 'puppeteer';
import fs from 'fs';
import cheerio from 'cheerio';
import _ from 'underscore';
import getHrefs from 'get-hrefs';
import PDFMerge from 'pdf-merge'


function saveNavLinks(options) {
    let url = `https://cloud.google.com/${options.product}/docs/${options.subProduct}`;
    let deferred = q.defer();
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
                                        'name': options.product,
                                        'links': links,
                                        'count': links.length
                                    };
                                    //console.log((products));
                                    const pathToOutputJson = __dirname + '/../output/products.json';
                                    fs.readFile(pathToOutputJson, 'utf8', (err, data) => {
                                        if (err) {
                                            deferred.reject(err);
                                        }

                                        let jsonData = JSON.parse(data);
                                        let existing = _.find(jsonData.products, (a) => {
                                            return a.name === options.product
                                        });
                                        //console.log(existing);
                                        if (existing) {
                                            existing.links = p.links;
                                            existing.count = p.count;
                                        } else {
                                            jsonData.products.push(p);
                                        }

                                        fs.writeFile(pathToOutputJson, JSON.stringify(jsonData), (err) => {
                                            if (err) {
                                                deferred.reject(err);
                                            } else {
                                                deferred.resolve(p);
                                            }
                                        })
                                    });
                                    // page.close();
                                    // browser.close();
                                })
                                .catch((err) => {
                                    deferred.reject(err);
                                })
                        })
                        .catch((err) => {
                            deferred.reject(err);
                        })
                })
                .catch((err) => {
                    deferred.reject(err);
                })
        })
        .catch((err) => {
            deferred.reject(err);
        })

    return deferred.promise;
}

function downloadAndMergePdf(options, hrefs) {
    const cookies = [{
        'name': 'devsite_tabbar_last',
        'value': `code-sample:${options.code}`,
        'domain': 'cloud.google.com',
        'path': '/'
    }];

    if(!fs.existsSync(`${options.pathToSave}/${options.product}`)){
        fs.mkdirSync(`${options.pathToSave}/${options.product}`);
    }

    let files = [],
        i = 0,
        deferred = q.defer();

    puppeteer.launch()
        .then((browser) => {
            hrefs.forEach((element, indx) => {

                let urlParts = element.split("/");

                let pathToSave = `${options.pathToSave}/${options.product}/${indx}-${urlParts[urlParts.length - 1]}.pdf`;

                files.push(__dirname + `\\${options.pathToSave}\\${options.product}\\${indx}-${urlParts[urlParts.length - 1]}.pdf`);
                browser.newPage().then((page) => {
                    page.goto(element, {
                            timeout: 0,
                            waitUntil: "networkidle0"
                        })
                        .then((res) => {
                            page.setCookie(...cookies).then(() => {
                                page.pdf({
                                        path: pathToSave,
                                        format: 'Letter',
                                        scale: 0.8
                                    })
                                    .then(() => {
                                        page.close().then(() => {
                                            i++;
                                            if (i == files.length) {

                                                PDFMerge(files, {
                                                        output: `${__dirname}\\${options.pathToSave}\\${options.product}\\${options.fileName}`
                                                    })
                                                    .then((buffer) => {
                                                        page.close();
                                                        browser.close();
                                                        process.exit();
                                                    }).catch((err) => {
                                                        console.log(err);
                                                    })
                                            }
                                        })
                                    });
                            })

                        }).catch((err) => {
                            console.log(err);
                        })
                }).catch((err) => {
                    console.log(err);
                });
            });
        });

}


export async function downloadDocs(options) {
    console.log(options);
    saveNavLinks(options).then((product) => {
            //console.log(product);
            downloadAndMergePdf(options, product.links);
        })
        .catch((err) => {
            console.log(err);
        })

}