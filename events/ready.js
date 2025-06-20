module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`Hazır! ${client.user.tag} olarak giriş yapıldı.`);
    
    // Set the bot's activity with Discord.js v13 format - STREAMING type shows purple button
    client.user.setActivity('.k | Apex Lig Streaming', { 
      type: 'STREAMING',
      url: 'https://www.twitch.tv/apexlig' 
    });
    
    // Log the loaded commands
    console.log(`Loaded commands: ${Array.from(client.commands.keys()).join(', ')}`);
  }
};
