const { Client, Collection } = require('discord.js'); // v12 doesn't use Intents this way
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Add express server to keep the bot alive on Glitch
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Futbol Kayıt Botu çalışıyor!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Create a new client instance with Discord.js v12 format
const client = new Client({
  partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
  // Discord.js v12 uses different intent format, more like strings
  ws: {
    intents: [
      'GUILDS',
      'GUILD_MESSAGES',
      'GUILD_MEMBERS',
      'GUILD_MESSAGE_REACTIONS'
    ]
  }
});

// Create collections for commands
client.commands = new Collection();

// Load command files
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  // Set a new item in the Collection with the key as the command name and the value as the exported module
  client.commands.set(command.name, command);
}

// Load event files
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// Login to Discord with the token
client.login(process.env.TOKEN).catch(err => {
  console.error('Discord login error:', err);
  console.log('Please make sure you have set the TOKEN in .env file');
});

// Error handling
client.on('error', error => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Keep the bot alive on Glitch by pinging the app
setInterval(() => {
  if (process.env.PROJECT_DOMAIN) {
    console.log('Keeping the bot alive...');
    require('https').get(`https://${process.env.PROJECT_DOMAIN}.glitch.me/`);
  }
}, 280000); // every 4.7 minutes
