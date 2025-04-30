const db = require('../utils/database');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    // Ignore messages from bots and non-text channels
    if (message.author.bot || !message.guild) return;
    
    // Get prefix (hardcoded as '.' for now)
    const prefix = '.';
    
    // Check if message starts with prefix
    if (!message.content.startsWith(prefix)) return;
    
    // Parse command and arguments
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    // Find command in the collection
    let command = client.commands.get(commandName);
    
    // Handle command aliases
    if (!command) {
      // Check for common aliases
      if (commandName === 'topsıra' || commandName === 'topkayıt' || commandName === 'kayıttop') {
        command = client.commands.get('top');
      } else if (commandName === 'kayıt' || commandName === 'kayit') {
        command = client.commands.get('k');
      } else if (commandName === 'kayitkur' || commandName === 'kurulum') {
        command = client.commands.get('kayıtkur');
      } else if (commandName === 'help' || commandName === 'yardim' || commandName === 'komutlar') {
        command = client.commands.get('yardım');
      } else if (commandName === 'geçmiş' || commandName === 'gecmis' || commandName === 'bilgi' || commandName === 'info') {
        command = client.commands.get('g');
      } else if (commandName === 'ukayıt' || commandName === 'ukayit' || commandName === 'ksil' || commandName === 'kayıtsil') {
        command = client.commands.get('uk');
      }
    }
    
    // If command doesn't exist, return
    if (!command) return;
    
    try {
      // Execute the command
      await command.execute(message, args, client);
    } catch (error) {
      console.error(`Error executing ${commandName} command:`, error);
      message.reply('❌ Bu komutu çalıştırırken bir hata oluştu!').catch(console.error);
    }
  }
};
