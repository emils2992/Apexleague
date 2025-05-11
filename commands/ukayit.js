const { MessageEmbed } = require('discord.js');
const db = require('../utils/database');

module.exports = {
  name: 'ukayit',
  description: 'Kullanıcının üyelik kaydını sıfırla ve kayıtsız rolü ver',
  async execute(message, args, client) {
    // Get guild settings
    const guildId = message.guild.id;
    const settings = await db.getGuildSettings(guildId);
    
    if (!settings) {
      return message.reply('❓ Kayıt sistemi kurulmamış! Lütfen önce `.kayıtkur` komutunu kullanın.');
    }
    
    // Check if user has permission to use this command
    if (settings.yetkiliRole && !message.member.roles.cache.has(settings.yetkiliRole) && !message.member.permissions.has(8n)) {
      return message.reply('🚫 Bu komutu kullanmak için yetkili olmalısınız!');
    }
    
    // Check if the command has the correct format
    if (args.length < 1) {
      return message.reply('ℹ️ Doğru kullanım: `.uk @kullanıcı`');
    }
    
    // Get the mentioned user
    const target = message.mentions.members.first();
    if (!target) {
      return message.reply('⚠️ Lütfen bir kullanıcı etiketleyin!');
    }
    
    // Check if the kayitsiz role exists
    if (!settings.kayitsizRole) {
      return message.reply('❌ Kayıtsız rolü ayarlanmamış!');
    }
    
    const kayitsizRole = message.guild.roles.cache.get(settings.kayitsizRole);
    if (!kayitsizRole) {
      return message.reply('❌ Kayıtsız rolü bulunamadı!');
    }
    
    try {
      // Get all user's current roles (except @everyone)
      const currentRoles = target.roles.cache.filter(role => role.id !== message.guild.id);
      
      // Remove all roles and add kayitsiz role
      await target.roles.remove(currentRoles);
      await target.roles.add(kayitsizRole);
      
      // Set nickname to "Kayıtsız" if autoNickname is enabled
      if (settings.autoNickname) {
        await target.setNickname('Kayıtsız');
      }
      
      // Create embed for unregistration
      const embed = new MessageEmbed()
        .setColor('#e74c3c')
        .setTitle('🔄 Kayıt Sıfırlandı')
        .setDescription(`**${target.user.tag}** üyesinin kaydı başarıyla sıfırlandı.`)
        .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
        .addField('👤 Kullanıcı', `<@${target.id}>`, true)
        .addField('🛡️ Verilen Rol', `<@&${kayitsizRole.id}>`, true)
        .addField('👮 İşlemi Yapan', `<@${message.author.id}>`, true)
        .addField('⏰ İşlem Zamanı', new Date().toLocaleString('tr-TR'), true)
        .setFooter({ text: 'Futbol Kayıt Sistemi • Kayıt Sıfırlama' })
        .setTimestamp();
      
      // Log to general log channel if set
      if (settings.logChannel) {
        const logChannel = message.guild.channels.cache.get(settings.logChannel);
        if (logChannel) {
          await logChannel.send({ embeds: [embed] });
        }
      }
      
      // Send reply
      message.reply({ embeds: [embed] });
      
      // Create registration record for unregistration
      const registrationData = {
        guildId: guildId,
        memberId: target.id,
        memberName: target.user.tag,
        staffId: message.author.id,
        staffName: message.author.tag,
        timestamp: new Date().toISOString(),
        assignedName: 'Kayıtsız',
        assignedRole: 'Kayıtsız',
        assignedRoleId: kayitsizRole.id,
        unregistered: true
      };
      
      // Add to registration database
      await db.addRegistration(registrationData);
      
      // Send DM to target
      try {
        await target.send({
          embeds: [
            new MessageEmbed()
              .setColor('#e74c3c')
              .setTitle('🔄 Kayıt Durumunuz Sıfırlandı')
              .setDescription(`**${message.guild.name}** sunucusundaki üyelik kaydınız sıfırlanmış bulunmaktadır.`)
              .addField('💬 Bilgi', 'Yeniden kayıt olmak için lütfen yetkililere başvurun.')
              .setFooter({ text: 'Futbol Kayıt Sistemi' })
          ]
        });
      } catch (dmError) {
        console.log(`DM gönderilemedi: ${dmError}`);
        // Don't worry if DM fails
      }
      
    } catch (error) {
      console.error('Kayıt sıfırlama hatası:', error);
      message.reply('❌ Kayıt sıfırlama işlemi sırasında bir hata oluştu!');
    }
  }
};