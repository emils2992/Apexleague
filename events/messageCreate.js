const db = require('../utils/database');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    // Ignore messages from bots and non-text channels
    if (message.author.bot || !message.guild) return;

    // Get prefix and check if message starts with it
    const prefix = '.';
    if (!message.content.startsWith(prefix)) return;

    // Parse command and arguments
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Find command in the collection
    let command = client.commands.get(commandName);

    // Debug komut yükleme - Special debug command
    if (commandName === 'debugkomutlar') {
      const loadedCommands = Array.from(client.commands.keys()).join(', ');
      return message.reply(`Yüklü komutlar: ${loadedCommands}`);
    }

    // Handle command aliases - search through all commands for aliases
    if (!command) {
      for (const [name, cmd] of client.commands) {
        if (cmd.aliases && cmd.aliases.includes(commandName)) {
          command = cmd;
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
        }
      }
    }

    // If command doesn't exist, return silently
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