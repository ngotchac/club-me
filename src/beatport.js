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

const BASE_URL = 'https://www.beatport.com';

module.exports = class Beatport {

    static getInfo(artist) {
        let name = artist.name;

        return Beatport
            .search(name)
            .then(url => {
                if (url) return Beatport.fetchInfo(url);
                return null;
            });
    }

    static search(name) {
        let lName = name.toLowerCase();

        return new Promise((resolve, reject) => {
            request({
                url: BASE_URL + '/search/artists?q=' + name
            }, (err, resp, body) => {
                if (err) return reject(err);

                let $ = cheerio.load(body);

                let artistE = $('.bucket.artists li.artist')
                    .filter((idx, e) => {
                        let lAN = $(e)
                            .find('.artist-name')
                            .text()
                            .toLowerCase();

                        return lAN === lName;
                    })
                    .get(0);

                if (!artistE) return resolve();

                let url = $(artistE).find('a').attr('href');

                return resolve(url);
            });
        });
    }

    static fetchInfo(url) {
        return new Promise((resolve, reject) => {
            request({
                url: BASE_URL + url + '/tracks'
            }, (err, resp, body) => {
                if (err) return reject(err);

                let $ = cheerio.load(body);

                let genres = $('p.buk-track-genre')
                    .not('.bucket-track-header-col')
                    .map((idx, e) => $(e).text().trim())
                    .get()
                    .reduce((cur, g) => {
                        if (cur.indexOf(g) === -1) {
                            cur.push(g);
                        }

                        return cur;
                    }, []);

                return resolve({
                    url, genres
                });
            });
        });
    }

};
