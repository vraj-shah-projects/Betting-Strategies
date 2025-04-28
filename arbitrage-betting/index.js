require('dotenv').config();
const axios = require('axios');
//const nerdamer = require("nerdamer/all.min")

const apiKey = '' //process.argv[2] || 
const regions = 'au'
const markets = 'h2h' //head to head matches
const oddsFormat = 'decimal' //only works in decimal
const dateFormat = 'iso'

/* Popular Arbitrage Opportunities 
NCAAB (College Basketball): 'basketball_ncaab'
NCAAF (College Football): 'americanfootball_ncaaf'
NBA: 'basketball_nba'
La Liga: 'soccer_spain_la_liga'
AFL: 'aussierules_afl'
*/
const sport = ''

var arbitrageCount = 0

async function getSportsBets(sportKey) {
    try {
        const response = await axios.get(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds/`, {
                params: {
                    apiKey,
                    regions,
                    markets,
                    oddsFormat,
                    dateFormat,
                }
            })
            // Track number of requests made by API key
            //console.log('Remaining requests', response.headers['x-requests-remaining'])
            //console.log('Used requests', response.headers['x-requests-used'])
        return response.data

    } catch (error) {
        console.error('error', error)
    }
}

function isArbitrage(game) {
    var bestOdds = {}
    var bestBookmaker = ''
    var favourableBookmakers = []
    var impliedProbability = 0

    const bookmakerList = Object.keys(game)
    const outcomes = game[bookmakerList[0]]

    for (let i = 0; i < outcomes.length; i++) {
        bestOdds[outcomes[i]['name']] = 0
    }

    for (let i = 0; i < outcomes.length; i++) {
        for (let j = 0; j < bookmakerList.length; j++) {
            currBookmaker = bookmakerList[j]
                // Always look for the highest odds for each outcome of a game to minimise implied probability
            if (game[currBookmaker][i]['price'] > bestOdds[outcomes[i]['name']]) {
                bestOdds[outcomes[i]['name']] = game[currBookmaker][i]['price']
                bestBookmaker = currBookmaker
            }
        }
        favourableBookmakers.push(bestBookmaker)
            // Append the outcome of best odds to the implied probability variable
        impliedProbability = impliedProbability + (1 / bestOdds[outcomes[i]['name']])
    }

    // An arbitrage opportunity exists
    if (impliedProbability < 1) {
        console.log("\nArbitrage opportunity found!")
        console.log(`ROI: ${(1 - impliedProbability)*100}%\n`)
        arbitrageCount++

        console.log([bestOdds, favourableBookmakers, impliedProbability])
        return true
    }
    return false
}

(async() => {
    const games = await getSportsBets(sport);

    for (let i = 0; i < games.length; i++) {
        const bookmakers = games[i].bookmakers
        var odds = {}

        // Populate the odds dictionary with the relevant info
        for (let j = 0; j < bookmakers.length; j++) {
            odds[bookmakers[j].key] = bookmakers[j].markets[0].outcomes
        }

        // Check the odds across all bookmakers for each game to identify arbitrage
        if (Object.keys(odds).length > 0) {
            if (isArbitrage(odds)) {
                console.log(`Time of game: ${games[i].commence_time}\n\n----------------------------------------------\n`)
            }
        }
    }

    console.log(`${arbitrageCount} arbitrage opportunities found.`)

})()