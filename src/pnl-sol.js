const { Connection, PublicKey } = require('@solana/web3.js');
const { getToken, getPair, getSolData } = require("./utils");

const connection = new Connection(process.env.SOL_RPC);


async function getTokenHoldings(walletAddress, tokenMintAddress) {
    const walletPublicKey = new PublicKey(walletAddress)
    const tokenMintPublicKey = new PublicKey(tokenMintAddress);

    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPublicKey, { mint: tokenMintPublicKey });

    let totalBalance = 0;
    for (const account of tokenAccounts.value) {
        const balance = account.account.data.parsed.info.tokenAmount.uiAmount;
        totalBalance += balance;
    }

    return totalBalance;
}

async function getSwapDetails(txSignature, tokenAddress, userWallet) {
    const tx = await connection.getParsedTransaction(txSignature, { commitment: 'confirmed', maxSupportedTransactionVersion:0 });

    const fee = tx.meta.fee;

    const signer = userWallet;
    const accountKey2 = tx.transaction.message.accountKeys[1].toString()
    const raydium_authority_v4 = "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1";

    let pre_token_balances = tx.meta.preTokenBalances
    let post_token_balances = tx.meta.postTokenBalances

    let swaps = {};


    pre_token_balances.forEach((token_balance) => {
        if(!token_balance) return;
        if(!token_balance.owner || !token_balance.accountIndex || !token_balance.uiTokenAmount) return;
        let owner = token_balance.owner.toString().toLowerCase();
        if (owner === signer.toLowerCase() || owner === raydium_authority_v4.toLowerCase() || owner === accountKey2.toLowerCase()) {
            swaps[token_balance.accountIndex] = {
                token: token_balance.mint.toString(),
                token_decimals: token_balance.uiTokenAmount.decimals,
                owner: token_balance.owner.toString(),
                pre_token: token_balance.uiTokenAmount.amount,
                token_change: 0
            };
        }
    });

    post_token_balances.forEach((post_token_balance) => {
        if(!post_token_balance) return;
        if(!post_token_balance.owner || !post_token_balance.accountIndex || !post_token_balance.uiTokenAmount) return;

        let owner = post_token_balance.owner.toString().toLowerCase();
        if (owner === signer.toLowerCase() || owner === raydium_authority_v4.toLowerCase() || owner === accountKey2.toLowerCase()) {
            if (swaps.hasOwnProperty(post_token_balance.accountIndex)) {
                let swap = swaps[post_token_balance.accountIndex];
                swap.post_token = post_token_balance.uiTokenAmount.amount;
                let temp_token_change = parseFloat(post_token_balance.uiTokenAmount.amount) - parseFloat(swap.pre_token);
                swap.token_change = Math.abs(temp_token_change);
                swap.action = temp_token_change > 0 ? owner===signer.toLowerCase()?"BUY":"SELL" : owner===signer.toLowerCase()?"SELL":"BUY";
            } else {
                swaps[post_token_balance.accountIndex] = {
                    token: post_token_balance.mint.toString(),
                    token_decimals: post_token_balance.uiTokenAmount.decimals,
                    owner: post_token_balance.owner.toString(),
                    pre_token: "0",
                    post_token: post_token_balance.uiTokenAmount.amount,
                    token_change: Math.abs(parseFloat(post_token_balance.uiTokenAmount.amount)),
                    action:owner===signer.toLowerCase()?"BUY":"SELL"
                };
            }
        }
    });


    return {
        swaps: Object.keys(swaps).map((key) => swaps[key]),
        fee: fee
    }

}

async function getUserTokenData(userWalletAddress, tokenAddress, dexData){
    const { solPriceUSD: usdPrice, priceNative: priceNative, baseToken:{symbol} } = dexData


    let totalSpent = 0
    let totalSales = 0
    let totalFees = 0
    let tokenDecimal = 0


    const signatures = await connection.getSignaturesForAddress(new PublicKey(userWalletAddress),{},"confirmed");
    for (let signatureInfo of signatures) {
        const txSignature = signatureInfo.signature;
        let {swaps,fee} = await  getSwapDetails(txSignature, tokenAddress, userWalletAddress);

        if (!swaps || swaps.length === 0) continue;
        check = swaps.filter(swap => swap.token.toLowerCase() === tokenAddress.toLowerCase());
        if(check.length === 0) continue;

        totalFees += fee / 1_000_000_000;


        const tokenSwap = swaps.find(swap => swap.owner.toLowerCase() === userWalletAddress.toLowerCase() && swap.token.toLowerCase() === tokenAddress.toLowerCase())
        const WSOLSwap = swaps.find(swap => swap.token === "So11111111111111111111111111111111111111112" && swap.owner.toLowerCase() !== userWalletAddress.toLowerCase())


        if (WSOLSwap) {
            if(tokenSwap.action === "BUY") {
                totalSpent += parseFloat(WSOLSwap.token_change) / Math.pow(10, WSOLSwap.token_decimals);
            } else {
                totalSales += parseFloat(WSOLSwap.token_change) / Math.pow(10, WSOLSwap.token_decimals);
            }
        }

        if(tokenSwap) {
            tokenDecimal = tokenSwap.token_decimals
        }


    }

    const currentHoldings = await getTokenHoldings(userWalletAddress, tokenAddress);
    const totalHoldingsFormatted = (Number(currentHoldings) / (10 ** tokenDecimal))
    const totalProfit = ((totalSales + totalHoldingsFormatted) - totalSpent - totalFees).toFixed(3);
    const totalProfitUSD = (totalProfit * usdPrice).toFixed(2);
    const totalInvestment = totalSpent + totalFees;
    const roiPercentage = ((totalProfit / totalInvestment) * 100).toFixed(2);

    return {
        totalSpent: totalSpent.toFixed(4).toString(),
        totalSales: totalSales.toFixed(4).toString(),
        totalFees: totalFees.toFixed(4).toString(),
        totalProfit: totalProfit.toString(),
        roi: roiPercentage.toString(),
        usdProfit: totalProfitUSD,
        tokenSymbol: symbol
    }
}

async function ExecuteSOL(wallet,token) {
    try {
        var tokenLookup = await getToken(token, 'solana');
        if (!tokenLookup)  {
            tokenLookup = await getPair(token, 'solana');
        }


        if (!tokenLookup) return null

        return await getUserTokenData(wallet, token,  tokenLookup)
    } catch (e) {
        console.log(e)
        return null
    }
}

module.exports = { ExecuteSOL }


