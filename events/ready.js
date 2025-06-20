module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`Hazır! ${client.user.tag} olarak giriş yapıldı.`);
    
    // Set the bot's activity with Discord.js v13 format
    client.user.setActivity('.k | Apex Lig Streaming', { type: 'PLAYING' });
    
    // Log the loaded commands
    console.log(`Loaded commands: ${Array.from(client.commands.keys()).join(', ')}`);
  }
};
