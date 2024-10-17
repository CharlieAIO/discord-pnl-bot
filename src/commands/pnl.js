require('dotenv').config();
const {SlashCommandBuilder} = require("discord.js");
const {ExecuteETH} = require("../pnl-eth")
const {ExecuteSOL} = require("../pnl-sol")
const {createImage} = require("../image");
const path = require("path");


function createTextData(data, username, color) {


    try {
        var { totalSpent, totalSales, totalFees, totalProfit, roi, usdProfit, tokenSymbol } = data;
    } catch {
        var {totalSpent, totalSales, totalFees, totalProfit, roi, usdProfit, tokenSymbol } = {
            totalSpent: '0.00',
            totalSales: '0.00',
            totalFees: '0.00',
            totalProfit: '0.00',
            roi: '0%',
            usdProfit: '0.00',
            tokenSymbol: 'N/A'
        }

    }

    function calcTotalXPos(len_) {
        switch (len_) {
            case 6:
                return 820
            case 7:
                return 780
            case 8:
                return 740
            case 9:
                return 700
        }
    }

    function calcProfitXPos(len_) {
        switch (len_) {
            case 5:
                return 1560
            case 6:
                return 1490
            case 7:
                return 1300
            case 8:
                return 1150
            default:
                1100
        }
    }

    function calcRoiXPos(len_) {
        switch (len_) {
            case 4:
                return 2020
            case 5:
                return 1960
            case 6:
                return 1890
            case 7:
                return 1840
            case 8:
                return 1760
            case 9:
                return 1690
            case 10:
                return 1620
        }
    }

    function calcProfitUSDXPos(len_) {
        switch (len_) {
            case 4:
                return 2080
            case 5:
                return 2020
            case 6:
                return 1950
            case 7:
                return 1890
            case 8:
                return 1820
            case 9:
                return 1750
            case 10:
                return 1680
        }
    }

    const text = [
        {
            tag: 'token-symbol',
            text: tokenSymbol,
            colour: '#FFFFFF',
            font: 'Tahoma-Bold',
            size: 200,
            x: 163,
            y: 460
        },
        {
            tag: 'total-spent',
            text: totalSpent,
            colour: '#FFFFFF',
            font: 'Tahoma',
            size: 78,
            x: calcTotalXPos(totalSpent.length),
            y: 870
        },
        {
            tag: 'total-sales',
            text: totalSales,
            colour: '#FFFFFF',
            font: 'Tahoma',
            size: 78,
            x: calcTotalXPos(totalSales.length),
            y: 1100
        },
        {
            tag: 'total-fees',
            text: totalFees,
            colour: '#FFFFFF',
            font: 'Tahoma',
            size: 78,
            x: calcTotalXPos(totalFees.length),
            y: 1340
        },
        {
            tag: 'username',
            text: username,
            colour: '#C1C1C1',
            font: 'Tahoma-Bold',
            size: 64,
            x: 1985,
            y: 1358
        },
        {
            tag: 'total-profit',
            text: totalProfit,
            colour: color,
            font: 'Tahoma-Bold',
            size: 248,
            x: calcProfitXPos(totalProfit.length),
            y: 720
        },
        {
            tag: 'total-profit-usd',
            text: usdProfit,
            colour: color,
            font: 'Tahoma-Bold',
            size: 105,
            x: calcProfitUSDXPos(usdProfit.length),
            y: 935
        },
        {
            tag: 'roi',
            text: roi,
            colour: color,
            font: 'Tahoma-Bold',
            size: 105,
            x: calcRoiXPos(roi.length),
            y: 1140
        }
    ]

    return text

}

async function Execute(interaction) {
    const chain = interaction.options.getString('chain');
    const token = interaction.options.getString('token');
    const wallet = interaction.options.getString('wallet');

    let data;
    if(chain === 'eth') {
        data = await ExecuteETH(wallet, token)
    }
    else if(chain === 'sol') {
        data =  await ExecuteSOL(wallet, token)
    }

    if(!data) return null


    const isProfit = parseFloat(data.totalProfit) >= 0;


    const img = chain === 'eth' ? (isProfit ? 'ETH_WIN.png' : 'ETH_LOSS.png') : (isProfit ? 'SOL_WIN.png' : 'SOL_LOSS.png');
    const fullImgPath = path.join(__dirname, `../../templates/${img}`);
    
    const successColor = isProfit ? '#16BE7C' : '#EA4242';
    
    const textData = createTextData(data, interaction.user.username, successColor);
    
    await createImage(
        interaction.user.id,
        textData,
        interaction.user.displayAvatarURL({ format: 'png' }),
        fullImgPath)
    await new Promise(resolve => setTimeout(resolve, 2000));
    return true
}



module.exports = {
    data: new SlashCommandBuilder()
        .setName('pnl')
        .setDescription('Genearate PNL graphic for you wallet for a specific token')
        .addStringOption(option =>
            option.setName('chain')
                .setDescription('Choose an chain')
                .setRequired(true)
                .addChoices({
                        name: 'Ethereum',
                        value: 'eth'
                    }, {
                        name: 'Solana',
                        value: 'sol'
                    }
                ))
        .addStringOption(option => option.setName('token').setDescription('Token address').setRequired(true))
        .addStringOption(option => option.setName('wallet').setDescription('Wallet address').setRequired(true)),
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            const response = await Execute(interaction);
            if (response) {
                await interaction.followUp({ files: [`../images/${interaction.user.id}.png`], ephemeral: true });
            }
            else {
                await interaction.followUp('Something went wrong. Please try again later.', { ephemeral: true })
            }
        } catch (e) { console.log(e) }
    },
};