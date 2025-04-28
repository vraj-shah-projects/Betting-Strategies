require('dotenv').config();
const axios = require('axios');

const apiKey = '' //process.argv[2] || 
const regions = 'au'
const markets = 'h2h' //head to head matches
const oddsFormat = 'decimal' //only works in decimal
const dateFormat = 'iso'

/* Popular Positive EV Opportunities 
NCAAB (College Basketball): 'basketball_ncaab'
NCAAF (College Football): 'americanfootball_ncaaf'
NBA: 'basketball_nba'
La Liga: 'soccer_spain_la_liga'
AFL: 'aussierules_afl'
*/
const sport = ''

const exchangeKey = 'betfair_ex_au' // get true probabilities of events
var evCount = 0
var betSize = 20.00 // amount to bet on a certain outcome

function isPositiveEv(game, exchange) {
    const bookmakerList = Object.keys(game)
    const outcomes = game[bookmakerList[0]]
    var probabilities = {}
    var bestOutcome;
    var bestBookmaker;
    var profitOnOutcome = 0
    var highestEv = 0

    // Populate the probabilities dictionary with the 'true' odds of an event
    // Use a betting exchange (as opposed to a bookmaker) to get these probabilities
    for (let i = 0; i < outcomes.length; i++) {
        probabilities[exchange[exchangeKey][i]['name']] = 1 / exchange[exchangeKey][i]['price']
    }

    for (let i = 0; i < bookmakerList.length; i++) {
        var mispricedOutcomes = {}
        currBookmaker = bookmakerList[i]

        // For each outcome, check its probability claimed by the bookmaker
        for (let j = 0; j < outcomes.length; j++) {
            currEvent = game[currBookmaker][j]
            bookmakerProbability = 1 / currEvent['price']
                // If the true probability of an event is greater than what the bookmaker claims,
                // identify it as a mispriced outcome
            if (probabilities[currEvent['name']] > bookmakerProbability) {
                mispricedOutcomes[currEvent['name']] = currEvent['price']
            }

        }

        // Iterate over the 'mispriced' outcomes to find the highest EV opportunity
        eventsToBet = Object.keys(mispricedOutcomes)
        if (eventsToBet.length > 0) {
            for (let k = 0; k < eventsToBet.length; k++) {

                currOutcome = eventsToBet[k]
                    // Calculate the profit with the stake on a certain outcome
                profit = betSize * (mispricedOutcomes[currOutcome] - 1)
                    // Calculate the EV: profit * (win probability) + loss * (lose probability) 
                ev = probabilities[currOutcome] * profit - (1 - probabilities[currOutcome]) * betSize

                // Update the current best EV opportunity
                if (ev > highestEv) {
                    profitOnOutcome = profit
                    highestEv = ev
                    bestBookmaker = currBookmaker
                    bestOutcome = currOutcome
                }
            }
        }
    }

    // Positive EV bet exists
    if (highestEv > 0) {
        console.log("Positive EV opportunity found!")
        console.log(`Potential Profit: $${profitOnOutcome}`)
        console.log(`Expected Value: $${highestEv}\n\nBookie Odds:\n`)
        console.log(game[bestBookmaker])
        console.log("\nActual Odds:\n")
        console.log(exchange[exchangeKey])
        console.log(`\nBet $${betSize} on ${bestOutcome} with ${bestBookmaker}`)
        evCount++

        return true
    }

    return false
}

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

(async() => {
    const games = await getSportsBets(sport)

    for (let i = 0; i < games.length; i++) {
        const bookmakers = games[i].bookmakers
        var odds = {}
        var exchangeOdds = {}
        var exchangeOnGame = false

        // Populate the odds dictionary with odds from all the bookmakers for a certain game
        // Populate the exchangeOdds dictionary with the odds from a betting exchange
        for (let j = 0; j < bookmakers.length; j++) {
            if (bookmakers[j].key == exchangeKey) {
                exchangeOdds[bookmakers[j].key] = bookmakers[j].markets[0].outcomes
                exchangeOnGame = true
            } else {
                odds[bookmakers[j].key] = bookmakers[j].markets[0].outcomes
            }
        }

        // Check for positive EV opportunity
        if (exchangeOnGame) {
            if (isPositiveEv(odds, exchangeOdds)) {
                console.log(`Time of game: ${games[i].commence_time}\n\n----------------------------------------------\n`)
            }
        }
    }

    console.log(`${evCount} positive EV opportunities found.`)
})()