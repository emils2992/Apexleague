const db = require('../utils/database');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    // Debug: Log all messages
    console.log(`Message received: ${message.content}`);
    
    // Ignore messages from bots and non-text channels
    if (message.author.bot || !message.guild) {
      console.log('Message ignored: from bot or not in guild');
      return;
    }
    
    // Get prefix (hardcoded as '.' for now)
    const prefix = '.';
    
    // Check if message starts with prefix
    if (!message.content.startsWith(prefix)) {
      console.log('Message ignored: does not start with prefix');
      return;
    }
    
    console.log('Command detected: ' + message.content);
    
    // Parse command and arguments
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    // Find command in the collection
    let command = client.commands.get(commandName);
    
    // Debug komut yükleme 
    if (commandName === 'debugkomutlar') {
      const loadedCommands = Array.from(client.commands.keys()).join(', ');
      return message.reply(`Yüklü komutlar: ${loadedCommands}`);
    }
    
    // Handle command aliases
    if (!command) {
      console.log(`Aranan komut: ${commandName} - Yüklü komutlar: ${Array.from(client.commands.keys()).join(', ')}`);
      
      // Check for common aliases
      if (commandName === 'topsıra' || commandName === 'topkayıt' || commandName === 'kayıttop') {
        command = client.commands.get('top');
      } else if (commandName === 'kayıt' || commandName === 'kayit' || commandName === 'k') {
        command = client.commands.get('kayit');
      } else if (commandName === 'kayıtkur' || commandName === 'kayitkur' || commandName === 'kurulum') {
        command = client.commands.get('kayitkur');
      } else if (commandName === 'help' || commandName === 'yardim' || commandName === 'komutlar' || commandName === 'yardım') {
        command = client.commands.get('yardim');
      } else if (commandName === 'geçmiş' || commandName === 'gecmis' || commandName === 'bilgi' || commandName === 'info' || commandName === 'g') {
        command = client.commands.get('gecmis');
      } else if (commandName === 'ukayıt' || commandName === 'ukayit' || commandName === 'ksil' || commandName === 'kayıtsil' || commandName === 'uk') {
        command = client.commands.get('ukayit');
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
