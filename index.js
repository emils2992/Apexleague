const { Client, Intents, Collection } = require('discord.js');
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

// Create a new client instance
const client = new Client({ 
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS
  ],
  partials: ['MESSAGE', 'CHANNEL', 'REACTION']
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
const TOKEN = process.env.TOKEN;
console.log("Token length:", TOKEN ? TOKEN.length : "TOKEN not found");
console.log("First few characters:", TOKEN ? TOKEN.substring(0, 5) + "..." : "N/A");

// Explicitly handle process.env
console.log("All env variables:", Object.keys(process.env).join(", "));

// Try to login with detailed error handling
client.login(TOKEN)
  .then(() => {
    console.log("Login successful!");
  })
  .catch(err => {
    console.error('Discord login error type:', err.constructor.name);
    console.error('Error code:', err.code);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    console.log('Please make sure TOKEN is correct and bot is properly configured in Discord Developer Portal');
    
    // Try alternative login method
    console.log("Attempting alternative login method...");
    setTimeout(() => {
      client.login(TOKEN.trim())
        .then(() => console.log("Alternative login successful!"))
        .catch(altErr => console.error("Alternative login also failed:", altErr.message));
    }, 3000);
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
