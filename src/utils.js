const axios = require('axios');
require('dotenv').config();

async function fetchCoinbasePrice(coin) {
    try {
        const res = await axios.get(`https://api.coinbase.com/v2/prices/${coin.toUpperCase()}-USD/buy`);
        return Number(res.data.data.amount);
    } catch (e) {
        return 0
    }
}

async function getPair(pair, chain) {
    try {
        const res = await axios.get(`https://api.dexscreener.com/latest/dex/pairs/${chain}/${pair}`);

        var quotePrice = 0
        if (chain === 'solana') {
            quotePrice = await fetchCoinbasePrice('SOL')
        } else {
            quotePrice = await fetchCoinbasePrice('ETH')
        }

        if (res.data.pairs.length === 0) {
            return null
        }

        let data = res.data.pairs[0]
        data.quotePrice = quotePrice

        return data
    } catch (e) {
        return null
    }
}

async function getToken(token, chain) {
    try {
        const res = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${token}`);

        var quotePrice = 0
        if (chain === 'solana') {
            quotePrice = await fetchCoinbasePrice('SOL')
        } else {
            quotePrice = await fetchCoinbasePrice('ETH')
        }

        if (res.data.pairs.length === 0) {
            return null
        }

        let data = res.data.pairs[0]
        data.quotePrice = quotePrice

        return data
    } catch (e) {
        return null
    }
}

module.exports = {
    getToken,
    getPair
}

