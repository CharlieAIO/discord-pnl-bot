const axios = require('axios');
const { Web3 } = require('web3');
const { getToken,getPair } = require('./utils')


const web3 = new Web3(process.env.ETH_RPC);


async function getSwap(hash, pairAddress, tokSymbol) {

    const swapABI = [
        {
            "indexed": true,
            "name": "sender",
            "type": "address"
        },
        {
            "indexed": false,
            "name": "amount0In",
            "type": "uint"
        },
        {
            "indexed": false,
            "name": "amount1In",
            "type": "uint"
        },
        {
            "indexed": false,
            "name": "amount0Out",
            "type": "uint"
        },
        {
            "indexed": false,
            "name": "amount1Out",
            "type": "uint"
        },
        {
            "indexed": true,
            "name": "to",
            "type": "address"
        }
    ]
    const ABI = [
        {
            "constant": true,
            "inputs": [],
            "name": "token0",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [],
            "name": "token1",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "name",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "",
                    "type": "string"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "symbol",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "",
                    "type": "string"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "tokenId",
                    "type": "uint256"
                }
            ],
            "name": "tokenURI",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "",
                    "type": "string"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ]
    const ERC20_ABI = [
        {
            "constant": true,
            "inputs": [],
            "name": "symbol",
            "outputs": [{ "name": "", "type": "string" }],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [],
            "name": "decimals",
            "outputs": [{ "name": "", "type": "uint8" }],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [{ "name": "_owner", "type": "address" }],
            "name": "balanceOf",
            "outputs": [{ "name": "balance", "type": "uint256" }],
            "type": "function"
        }
    ];

    async function getTokenAddresses(address) {
        const pairContract = new web3.eth.Contract(ABI, address);

        const token0Address = await pairContract.methods.token0().call();
        const token1Address = await pairContract.methods.token1().call();
        return [token0Address, token1Address];
    }

    async function getTokenDetails(tokenAddress) {
        const tokenContract = new web3.eth.Contract(ERC20_ABI, tokenAddress);
        const symbol = await tokenContract.methods.symbol().call();
        const decimals = await tokenContract.methods.decimals().call();
        return { symbol, decimals };
    }
    function identifyTokenSwap(data, token0Symbol, token1Symbol, token0Decimals, token1Decimals) {
        function fromTokenAmount(amount, decimals) {
            const etherAmount = BigInt(amount);
            const divisor = BigInt(10) ** BigInt(decimals);
            const quotient = etherAmount / divisor;
            const remainder = etherAmount % divisor;

            const integerPart = quotient.toString();
            const fractionalPart = remainder.toString().padStart(Number(decimals), '0').slice(0, Number(decimals));


            return `${integerPart}.${fractionalPart}`;
        }

        const tokenSwapInfo = {};


        if(tokSymbol === token0Symbol) {
            if(data.amount0Out > 0) {
                tokenSwapInfo.action = 'buy';
            }else {
                tokenSwapInfo.action = 'sell';
            }

            if(data.amount0In > 0) {
                tokenSwapInfo.tokenAmount = fromTokenAmount(data.amount0In, token0Decimals);
            }else {
                tokenSwapInfo.tokenAmount = fromTokenAmount(data.amount0Out, token0Decimals);
            }

            if(data.amount1Out > 0) {
                tokenSwapInfo.refAmount = fromTokenAmount(data.amount1Out, token1Decimals);
            } else {
                tokenSwapInfo.refAmount = fromTokenAmount(data.amount1In, token1Decimals);
            }
        } else {
            if(data.amount1Out > 0) {
                tokenSwapInfo.action = 'buy';
            }else {
                tokenSwapInfo.action = 'sell';
            }

            if(data.amount1In > 0) {
                tokenSwapInfo.tokenAmount = fromTokenAmount(data.amount1In, token0Decimals);
            }else {
                tokenSwapInfo.tokenAmount = fromTokenAmount(data.amount1Out, token0Decimals);
            }

            if(data.amount0Out > 0) {
                tokenSwapInfo.refAmount = fromTokenAmount(data.amount0Out, token1Decimals);
            } else {
                tokenSwapInfo.refAmount = fromTokenAmount(data.amount0In, token1Decimals);
            }
        }



        return tokenSwapInfo;
    }




    var fullTx = await web3.eth.getTransactionReceipt(hash)
    let validLog;

    fullTx.logs.forEach((log) => {
        if (log.topics?.length === 3) {
            try {
                var LOG = web3.eth.abi.decodeLog(swapABI,
                    log.data,
                    log.topics.slice(1)
                );
                if (LOG) validLog = LOG;
            } catch { }
        }
    })
    if (!validLog) return


    const [token0Address, token1Address] = await getTokenAddresses(pairAddress);


    const [token0Details, token1Details] = await Promise.all([
        getTokenDetails(token0Address),
        getTokenDetails(token1Address)
    ]);


    const swapDetails = identifyTokenSwap(validLog, token0Details.symbol, token1Details.symbol, token0Details.decimals, token1Details.decimals);
    return swapDetails
}


async function getBalance(userWallet, tokenAddress) {
    try {
        const minABI = [
            // balanceOf
            {
                "constant": true,
                "inputs": [{ "name": "_owner", "type": "address" }],
                "name": "balanceOf",
                "outputs": [{ "name": "balance", "type": "uint256" }],
                "type": "function"
            },
        ];

        // Get Contract and balance
        const contract = new web3.eth.Contract(minABI, tokenAddress);
        const balance = await contract.methods.balanceOf(userWallet).call();

        return balance;
    } catch {
        return 0
    }

}


async function getUserTokenData(userWallet, tokenAddress, dexData, pairAddress) {
    const { quotePrice: usdPrice, priceNative: priceNative, baseToken:{symbol} } = dexData


    try {
        let totalSpent = 0
        let totalSales = 0
        let totalFees = 0

        let tokenSymbol = ''


        // Get the transaction history from Etherscan API
        const response = await axios.get(`https://api.etherscan.io/api?module=account&action=tokentx&address=${userWallet}&startblock=0&endblock=999999999&sort=asc&apikey=${process.env.ETHERSCAN_API_KEY}`);

        const transactions = response.data.result;
        const tokenTransactions = transactions.filter(tx => tx.contractAddress.toLowerCase() === tokenAddress.toLowerCase());


        let hashUsed = []
        for (let tx of tokenTransactions) {
            tokenSymbol = tx.tokenSymbol
            if (hashUsed.includes(tx.hash)) continue
            hashUsed.push(tx.hash)
            var tokenDecimal = parseInt(tx.tokenDecimal);
            const gasPrice = Number(tx.gasPrice);
            const gasUsed = Number(tx.gasUsed);
            const fee = gasPrice * gasUsed;

            let swap_details = await getSwap(tx.hash, pairAddress,symbol)
            if (!swap_details) continue


            if(swap_details.action === 'buy') {
                totalSpent += parseFloat(swap_details.refAmount);
            } else {
                totalSales += parseFloat(swap_details.refAmount);
            }

            totalFees += fee;

        }

        const totalHoldings = await getBalance(userWallet, tokenAddress);
        const totalHoldingsFormatted = (Number(totalHoldings) / (10 ** tokenDecimal) * priceNative)
        const feesInEther = Number(web3.utils.fromWei(totalFees.toString(), 'ether'))


        const totalProfit = ((totalSales + totalHoldingsFormatted) - totalSpent - feesInEther).toFixed(3);
        const totalProfitUSD = (totalProfit * usdPrice).toFixed(2);
        const totalInvestment = totalSpent + feesInEther
        const roiPercentage = ((totalProfit / totalInvestment) * 100).toFixed(2);


        return {
            totalSpent: totalSpent.toFixed(4).toString(),
            totalSales: totalSales.toFixed(4).toString(),
            totalFees: feesInEther.toFixed(4).toString(),
            totalProfit: totalProfit.toString(),
            roi: roiPercentage.toString(),
            usdProfit: totalProfitUSD,
            tokenSymbol: symbol
        }


    } catch (error) {
        console.error(error);
    }
}


async function ExecuteETH(wallet,token) {
    try {
        var tokenLookup = await getToken(token, 'ethereum');
        if (!tokenLookup)  {
            tokenLookup = await getPair(token, 'ethereum');
        }

        if (!tokenLookup) return null

        return  await getUserTokenData(wallet, token, tokenLookup, tokenLookup.pairAddress);

    } catch (e) {
        console.log(e)
        return null
    }
}

module.exports = { ExecuteETH }