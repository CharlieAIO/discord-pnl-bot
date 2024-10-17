# Discord Profit&Loss Bot
*The bot will calculate the profit and loss of a wallet from a specific token and display the results in a graphic*

## Installation

1. Clone the repository
2. Install the dependencies
```bash
npm install
```
3. Create a .env file and add the following variables
```bash
BOT_TOKEN
CLIENT_ID
SOL_RPC
ETH_RPC
ETHERSCAN_API_KEY
```
4. Run the bot
```bash
npm start
```
5. Or deploy with docker
```bash
docker build -t pnl .
docker run -d --restart unless-stopped pnl