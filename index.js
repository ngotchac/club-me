let log = require('npmlog'),
    chalk = require('chalk');

let RA = require('./src/ra');
let Beatport = require('./src/beatport');
let Discogs = require('./src/discogs');

const LOG_PREFIX = 'club-me';

const FULL = false;

let Filter;
// let Filter = 'kaos';

function getInfos(party) {
    let artists = party.artists;

    let p = artists.map(a => {
        return Beatport.getInfo(a)
            .then(info => {
                a.beatport = info;
                return a;
            })
            .then(a => Discogs.getInfo(a))
            .then(info => {
                a.discogs = info;
                return a;
            });
    });

    return Promise
        .all(p)
        .then(infos => {
            party.artists = infos;
            return party;
        });
}

function printParty(party) {
    let search = [
        party.name, party.club.name
    ].join(' ');

    if (Filter) {
        let regex = new RegExp(Filter, 'gi');
        if (!regex.test(search)) return false;
    }

    process.stdout.write(`> ${chalk.bold(party.name)} @ ${party.club.name}\n`);
    process.stdout.write(`    ${chalk.green(party.price)} ${party.priceTag}\n`);

    let genres = getGenres(party);
    process.stdout.write(`    ${genres.join(', ')}\n`);

    if (!FULL) return process.stdout.write('\n');

    party.artists.forEach(artist => {
        process.stdout.write(`      * ${chalk.bold(artist.name)}\n`);

        if (artist.beatport) {
            process.stdout.write(`        Beatport: `);
            process.stdout.write(artist.beatport.genres.join(', '));
            process.stdout.write('\n');
        }

        if (artist.discogs) {
            process.stdout.write(`        Discogs: `);
            process.stdout.write(artist.discogs.profile);
            process.stdout.write('\n');

            artist.discogs.albums.forEach(album => {
                process.stdout.write(`          - `);
                process.stdout.write(`${album.title}`);
                
                if (album.genres) {
                    process.stdout.write(` (${album.genres.join(', ')})`);
                }

                process.stdout.write(`\n`);
            });
        }

        process.stdout.write('\n');
    });

    process.stdout.write('\n');
}

function getGenres(party) {
    let genres = [];

    party.artists.forEach(artist => {
        if (artist.beatport) {
            genres = [].concat(genres, artist.beatport.genres);
        }

        if (artist.discogs) {
            artist.discogs.albums.forEach(a => {
                genres = [].concat(genres, a.genres);
            });
        }
    });

    let genresObj = genres
        .reduce((cur, g) => {
            if (!cur[g]) cur[g] = 0;
            cur[g]++;
            return cur;
        }, {});

    let sortedGenres = Object.keys(genresObj)
        .sort((a, b) => genresObj[b] - genresObj[a]);

    let sortedGenresFmt = [].concat(sortedGenres);

    if (genresObj[sortedGenres[0]] > genresObj[sortedGenres[1]]) {
        sortedGenresFmt[0] = chalk.bold(sortedGenres[0]);
    }

    for (let i = 0; i < sortedGenres.length - 1; i++) {
        if (genresObj[sortedGenres[i]] >= genresObj[sortedGenres[i+1]]*2) {
            return sortedGenresFmt.slice(0, i+1);
        }
    }

    return sortedGenres;
}

RA
    .getParties()
    .then(parties => {
        let p = Promise.resolve([]);

        parties
            .slice(0, 20)
            .forEach(party => {
                p = p
                    .then(data => {
                        log.info(LOG_PREFIX, 'getting infos for', party.name);

                        return RA
                            .getParty(party)
                            .then(getInfos)
                            .then(d => {
                                printParty(d);
                                data.push(d);
                                return data;
                            });
                    });
            });

        return p;
    })
    .catch(e => setTimeout(() => {
        throw e; 
    }));


process.on('unhandledRejection', (reason, p) => {
    log.error(LOG_PREFIX, p, reason);
});

process.on('uncaughtException', err => {
    log.error(LOG_PREFIX, err);
});

