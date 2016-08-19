let rRequest = require('request'),
    cheerio = require('cheerio');

let path = require('path'),
    os = require('os'),
    mkdirp = require('mkdirp'),
    request = require('cached-request')(rRequest);
let cacheDirectory = path.join(os.tmpdir(), '/cache-club-me');
mkdirp.sync(cacheDirectory);
request.setCacheDirectory(cacheDirectory);
request.setValue('ttl', 365*24*3600000);

const BASE_URL = 'https://www.residentadvisor.net';

module.exports = class RA {

    static getParties() {
        return new Promise((resolve, reject) => {
            request({
                url: BASE_URL + '/events.aspx?ai=13&v=day&mn=8&yr=2016&dy=19'
            }, (err, response, body) => {
                if (err) return reject(err);

                var $ = cheerio.load(body);

                let parties = $('#event-listing li article')
                    .map((idx, e) => {
                        let url = $(e)
                            .find('h1[itemprop="summary"] a[itemprop="url"]')
                            .attr('href');

                        let name = $(e)
                            .find('h1[itemprop="summary"] a[itemprop="url"]')
                            .text();

                        let clubE = $(e)
                            .find('h1[itemprop="summary"] span a');
                        
                        let club = {
                            name: $(clubE).text(),
                            url: $(clubE).attr('href')
                        };
 
                        return {
                            name, club, url
                        };
                    })
                    .get();

                return resolve(parties);
            });
        });
    }

    static getParty(party) {
        let name = party.name;

        return new Promise((resolve, reject) => {
            request({
                url: BASE_URL + party.url
            }, (err, resp, body) => {
                if (err) return reject(err);

                var $ = cheerio.load(body);

                let price = $('#tickets li.onsale label p span')
                    .text();

                let priceTagHTML = $('#tickets li.onsale label p')
                    .html();

                let priceTag = /^<span>.+<\/span>(.+)$/
                    .exec(priceTagHTML)
                    [1];

                let details = $('#event-detail');

                let artists = details
                    .find('.lineup a')
                    .map((idx, e) => {
                        let name = $(e).text();
                        let url = $(e).attr('href');

                        return {
                            name, url
                        };
                    })
                    .get();

                let detail = details
                    .find('#event-item .left p')
                    .not('.lineup')
                    .map((idx, e) => {
                        return $(e)
                            .text()
                            .split('\n')
                            .map(l => l.trim())
                            .join('\n')
                            .trim();
                    })
                    .get();

                return resolve({
                    name, price, priceTag, detail, artists
                });
            });
        });
    }

};

