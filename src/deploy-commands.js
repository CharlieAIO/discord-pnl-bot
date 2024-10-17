const fs = require('fs');
const { REST, Routes } = require('discord.js');
const path = require("path");
require('dotenv').config();


const commands = [];

async function loadCommands() {
    const commands_path = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commands_path).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(path.join(commands_path, file));

        let cmdData = command.data instanceof Promise ? await command.data : command.data;

        if (cmdData.toJSON && typeof cmdData.toJSON === "function") {
            commands.push(cmdData.toJSON());
        } else {
            commands.push(cmdData);
        }
    }
}

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
    try {
        await loadCommands();
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
})();
