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
    const command = client.commands.get(commandName);
    
    // If command doesn't exist, return
    if (!command) return;
    
    try {
      // Execute the command
      await command.execute(message, args, client);
    } catch (error) {
      console.error(`Error executing ${commandName} command:`, error);
      message.reply('Bu komutu çalıştırırken bir hata oluştu!').catch(console.error);
    }
  }
};
