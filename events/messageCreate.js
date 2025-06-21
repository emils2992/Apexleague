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

    // Handle command aliases - search through all commands for aliases
    if (!command) {
      console.log(`Command not found directly. Checking aliases for: ${commandName}`);
      
      for (const [name, cmd] of client.commands) {
        if (cmd.aliases && cmd.aliases.includes(commandName)) {
          command = cmd;
          console.log(`Found command through alias: ${name} (alias: ${commandName})`);
          break;
        }
      }

      // Additional hardcoded aliases for backward compatibility
      if (!command) {
        const hardcodedAliases = {
          'k': 'kayit',
          'uk': 'ukayit',
          'topsıra': 'topsira',
          'topkayıt': 'top',
          'kayıttop': 'top',
          'help': 'yardım',
          'komutlar': 'yardım',
          'bilgi': 'g',
          'info': 'g',
          'isim': 'id',
          'isimdeğiştir': 'id',
          'isimdegistir': 'id',
          'ksil': 'ukayit',
          'kayıtsil': 'ukayit',
          'kayitsifirla': 'ukayit',
          'kayıtsıfırla': 'ukayit',
          'sesgel': 'sescek',
          'seseçek': 'sescek',
          'sesgit': 'sesayril',
          'sesçık': 'sesayril'
        };
        
        if (hardcodedAliases[commandName]) {
          command = client.commands.get(hardcodedAliases[commandName]);
          if (command) {
            console.log(`Found command through hardcoded alias: ${hardcodedAliases[commandName]} (alias: ${commandName})`);
          }
        }
      }

      if (!command) {
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