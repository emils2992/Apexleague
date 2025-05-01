const { MessageEmbed } = require('discord.js');
const db = require('../utils/database');

module.exports = {
  name: 'id',
  description: 'Bir kullanıcının ismini değiştir',
  async execute(message, args, client) {
    // Get server settings from database
    const guildId = message.guild.id;
    const settings = await db.getGuildSettings(guildId);
    
    if (!settings) {
      return message.reply('❓ Kayıt sistemi kurulmamış! Lütfen önce `.kayıtkur` komutunu kullanın.');
    }
    
    // Check if user has permission to use this command (yetkili role or admin)
    if (settings.yetkiliRole && !message.member.roles.cache.has(settings.yetkiliRole) && !message.member.permissions.has(8n)) {
      return message.reply('🚫 Bu komutu kullanmak için yetkili olmalısınız!');
    }

    // Check if the command has the correct format
    if (args.length < 2) {
      return message.reply('ℹ️ Doğru kullanım: `.id @kullanıcı yeni_isim`');
    }

    // Get the mentioned user
    const target = message.mentions.members.first();
    if (!target) {
      return message.reply('⚠️ Lütfen bir kullanıcı etiketleyin!');
    }

    // Extract name from args (everything after the mention)
    const newName = args.slice(1).join(' ');
    
    try {
      // Save the old name for logging
      const oldName = target.displayName;
      
      // Set new nickname
      await target.setNickname(newName);
      
      // Send confirmation message
      const successEmbed = new MessageEmbed()
        .setColor('#00ff00')
        .setTitle('✅ İsim Değiştirildi')
        .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
        .addField('👤 Kullanıcı', `<@${target.id}>`, true)
        .addField('👮 Değiştiren', `<@${message.author.id}>`, true)
        .addField('📝 Eski İsim', oldName, false)
        .addField('✏️ Yeni İsim', newName, false)
        .setFooter({ text: 'İsim Değiştirme • Futbol Kayıt Sistemi' })
        .setTimestamp();
      
      await message.reply({ embeds: [successEmbed] });
      
      // Log the name change if there's a log channel
      if (settings.logChannel) {
        const logChannel = message.guild.channels.cache.get(settings.logChannel);
        if (logChannel) {
          const logEmbed = new MessageEmbed()
            .setTitle('📝 Kullanıcı İsmi Değiştirildi')
            .setColor('#3498db')
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
            .addField('👤 Kullanıcı', `<@${target.id}> (\`${target.user.tag}\`)`, false)
            .addField('👮 Değiştiren Yetkili', `<@${message.author.id}> (\`${message.author.tag}\`)`, false)
            .addField('📝 Eski İsim', `\`${oldName}\``, true)
            .addField('✏️ Yeni İsim', `\`${newName}\``, true)
            .addField('⏰ Değiştirilme Zamanı', new Date().toLocaleString('tr-TR'), false)
            .setFooter({ text: `ID: ${target.id} • İsim Değiştirme Logu` })
            .setTimestamp();
            
          await logChannel.send({ embeds: [logEmbed] });
        }
      }
      
    } catch (error) {
      console.error(error);
      message.reply('❌ İsim değiştirme işlemi sırasında bir hata oluştu!');
    }
  }
};