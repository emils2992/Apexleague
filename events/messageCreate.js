const db = require('../utils/database');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    // Debug: Log all messages for troubleshooting
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
    
    console.log(`Attempting to find command: ${commandName}`);
    
    // Find command in the collection
    let command = client.commands.get(commandName);
    
    // List all commands for debugging
    console.log(`Available commands: ${Array.from(client.commands.keys()).join(', ')}`);
    
    // Debug komut yükleme - Special debug command
    if (commandName === 'debugkomutlar') {
      console.log('Debug command executed');
      const loadedCommands = Array.from(client.commands.keys()).join(', ');
      return message.reply(`Yüklü komutlar: ${loadedCommands}`);
    }
    
    // Handle command aliases
    if (!command) {
      console.log(`Command not found directly. Checking aliases for: ${commandName}`);
      
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
      } else if (commandName === 'ukayıt' || commandName === 'ukayit' || commandName === 'ksil' || commandName === 'kayıtsil' || commandName === 'uk' || commandName === 'kayitsifirla' || commandName === 'kayıtsıfırla') {
        command = client.commands.get('ukayit');
      } else if (commandName === 'id' || commandName === 'isim' || commandName === 'isimdeğiştir' || commandName === 'isimdegistir') {
        command = client.commands.get('id');
      } else if (commandName === 'sescek' || commandName === 'sesçek' || commandName === 'sesgel' || commandName === 'seseçek') {
        try {
          const sescekCommand = require('../commands/sescek.js');
          command = sescekCommand;
        } catch (error) {
          console.error('Sesçek komutu yüklenirken hata oluştu:', error);
        }
      } else if (commandName === 'sesayril' || commandName === 'sesayrıl' || commandName === 'sesgit' || commandName === 'sesçık') {
        try {
          const sesayrilCommand = require('../commands/sesayril.js');
          command = sesayrilCommand;
        } catch (error) {
          console.error('Sesayril komutu yüklenirken hata oluştu:', error);
        }
      }
      
      if (command) {
        console.log(`Found command through alias: ${command.name}`);
      } else {
        console.log('No command found even after checking aliases');
      }
    }
    
    // If command doesn't exist, return
    if (!command) {
      console.log(`Command not found: ${commandName}`);
      return;
    }
    
    console.log(`Executing command: ${command.name}`);
    
    try {
      // Execute the command
      await command.execute(message, args, client);
      console.log(`Command executed successfully: ${command.name}`);
    } catch (error) {
      console.error(`Error executing ${commandName} command:`, error);
      message.reply('❌ Bu komutu çalıştırırken bir hata oluştu!').catch(console.error);
    }
  }
};
