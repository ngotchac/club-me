let rRequest = require('request'),
    urlencode = require('form-urlencoded'),
    cheerio = require('cheerio');

let path = require('path'),
    os = require('os'),
    mkdirp = require('mkdirp'),
    request = require('cached-request')(rRequest);
let cacheDirectory = path.join(os.tmpdir(), '/cache-club-me');
mkdirp.sync(cacheDirectory);
request.setCacheDirectory(cacheDirectory);
request.setValue('ttl', 365*24*3600000);

const BASE_URL = 'https://www.discogs.com';

module.exports = class Discogs {

    static getInfo(artist) {
        let name = artist.name;

        return Discogs
            .search(name)
            .then(url => {
                if (url) return Discogs.fetchInfo(url);
                return null;
            });
    }

    static search(name) {
        let lName = name.toLowerCase();
        let encName = urlencode({ q: name });

        return new Promise((resolve, reject) => {
            request({
                url: BASE_URL + `/search/?${encName}&type=artist`
            }, (err, resp, body) => {
                if (err) return reject(err);

                let $ = cheerio.load(body);

                let artistE = $('div[data-object-type="artist"] a.search_result_title')
                    .filter((idx, e) => {
                        let lAN = $(e)
                            .attr('title')
                            .toLowerCase();

                        return (lAN === lName) || ('dj ' + lName === lAN);
                    })
                    .get(0);

                if (!artistE) return resolve();

                let url = $(artistE).attr('href');

                return resolve(url);
            });
        });
    }

    static fetchInfo(url) {
        return new Promise((resolve, reject) => {
            request({
                url: BASE_URL + url + '?filter_anv=0&type=Releases'
            }, (err, resp, body) => {
                if (err) return reject(err);

                let $ = cheerio.load(body);

                let profile = $('#profile').text()
                    .trim()
                    .replace(/\r/, ' ');

                let albums = $('#artist tr td.title a')
                    .map((idx, e) => {
                        let url = $(e).attr('href');
                        let title = $(e).text().trim();

                        return { url, title };
                    })
                    .get()
                    .slice(0, 3);

                return Promise
                    .all(
                        albums.map(a => {
                            return Discogs
                                .fetchAlbumGenres(a.url)
                                .then(g => {
                                    a.genres = g;
                                    return a;
                                });
                        })
                    )
                    .then(albums => {
                        resolve({
                            url, profile, albums
                        });
                    }, reject);
            });
        });
    }

    static fetchAlbumGenres(url) {
        return new Promise((resolve, reject) => {
            request({
                url: BASE_URL + url
            }, (err, resp, body) => {
                if (err) return reject(err);

                let $ = cheerio.load(body);

                let genres = $('a[href^="/style"]')
                    .map((i, e) => $(e).text().trim())
                    .get();

                return resolve(genres);
            });
        });
    }

};
