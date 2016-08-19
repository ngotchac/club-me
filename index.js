let log = require('npmlog'),
    chalk = require('chalk');

let RA = require('./src/ra');
let Beatport = require('./src/beatport');

const LOG_PREFIX = 'club-me';

function getInfos(party) {
    let artists = party.artists;

    let p = artists.map(a => {
        return Beatport
            .getInfo(a)
            .then(info => {
                a.beatport = info;
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
    process.stdout.write(`> ${chalk.bold(party.name)}\n`);
    process.stdout.write(`    ${chalk.green(party.price)} ${party.priceTag}\n`);

    party.artists.forEach(artist => {
        process.stdout.write(`      * ${chalk.bold(artist.name)}\n`);

        if (artist.beatport) {
            process.stdout.write(`        Beatport: `);
            process.stdout.write(artist.beatport.genres.join(', '));
            process.stdout.write('\n');
        }

        process.stdout.write('\n');
    });

    process.stdout.write('\n');
}

RA
    .getParties()
    .then(parties => {
        let p = Promise.resolve([]);

        parties
            .slice(0, 2)
            .forEach(party => {
                p = p
                    .then(data => {
                        log.info(LOG_PREFIX, 'getting infos for', party.name);

                        return RA
                            .getParty(party)
                            .then(getInfos)
                            .then(d => {
                                data.push(d);
                                return data;
                            });
                    });
            });

        return p;
    })
    .then(parties => parties.forEach(p => printParty(p)))
    .catch(e => setTimeout(() => {
        throw e; 
    }));
