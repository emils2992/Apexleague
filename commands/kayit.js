const { MessageActionRow, MessageButton } = require('discord.js');
const db = require('../utils/database');

module.exports = {
  name: 'k',
  description: 'Register a user with a name and select a role',
  async execute(message, args, client) {
    // Check if user has permission to use this command
    if (!message.member.permissions.has('MANAGE_ROLES')) {
      return message.reply('Bu komutu kullanmak için yetkiniz bulunmuyor!');
    }

    // Check if the command has the correct format
    if (args.length < 2) {
      return message.reply('Doğru kullanım: `.k @kullanıcı isim`');
    }

    // Get the mentioned user
    const target = message.mentions.members.first();
    if (!target) {
      return message.reply('Lütfen bir kullanıcı etiketleyin!');
    }

    // Get server settings from database
    const guildId = message.guild.id;
    const settings = await db.getGuildSettings(guildId);
    
    if (!settings) {
      return message.reply('Kayıt sistemi kurulmamış! Lütfen önce `.kayıtkur` komutunu kullanın.');
    }

    // Extract name from args (everything after the mention)
    const name = args.slice(1).join(' ');
    
    try {
      // Set nickname
      await target.setNickname(name);
      
      // Remove "Kayıtsız" role if exists
      if (settings.kayitsizRole && target.roles.cache.has(settings.kayitsizRole)) {
        await target.roles.remove(settings.kayitsizRole);
      }
      
      // Create role selection buttons
      const row = new MessageActionRow()
        .addComponents(
          new MessageButton()
            .setCustomId(`role_futbolcu_${target.id}`)
            .setLabel('Futbolcu')
            .setStyle('PRIMARY'),
          new MessageButton()
            .setCustomId(`role_teknikdirektor_${target.id}`)
            .setLabel('Teknik Direktör')
            .setStyle('SUCCESS'),
          new MessageButton()
            .setCustomId(`role_baskan_${target.id}`)
            .setLabel('Başkan')
            .setStyle('DANGER'),
          new MessageButton()
            .setCustomId(`role_partner_${target.id}`)
            .setLabel('Partner')
            .setStyle('SECONDARY')
        );

      // Send message with buttons
      await message.reply({ 
        content: `**${name}** isimli kullanıcı için bir rol seçin:`,
        components: [row]
      });
      
    } catch (error) {
      console.error(error);
      message.reply('Kayıt işlemi sırasında bir hata oluştu!');
    }
  }
};
