const { MessageEmbed } = require('discord.js');
const db = require('../utils/database');

module.exports = {
  name: 'g',
  description: 'Kullanıcının geçmiş kayıtlarını ve sunucu giriş-çıkış bilgilerini gösterir',
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
      return message.reply('ℹ️ Doğru kullanım: `.g @kullanıcı`');
    }
    
    // Get the mentioned user
    const target = message.mentions.members.first();
    if (!target) {
      return message.reply('⚠️ Lütfen bir kullanıcı etiketleyin!');
    }
    
    try {
      // Get all registrations for this user in this guild
      const registrations = await db.getRegistrations(guildId);
      const userRegistrations = registrations.filter(reg => reg.memberId === target.id);
      
      // Create embed for user history
      const embed = new MessageEmbed()
        .setColor('#9b59b6')
        .setTitle('👤 Kullanıcı Geçmişi')
        .setDescription(`**${target.user.tag}** kullanıcısının geçmiş bilgileri`)
        .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
        .addField('🆔 Kullanıcı ID', target.id, true)
        .addField('📆 Hesap Oluşturulma', `<t:${Math.floor(target.user.createdTimestamp / 1000)}:F>\n(<t:${Math.floor(target.user.createdTimestamp / 1000)}:R>)`, true)
        .addField('🚪 Sunucuya Katılma', `<t:${Math.floor(target.joinedTimestamp / 1000)}:F>\n(<t:${Math.floor(target.joinedTimestamp / 1000)}:R>)`, true)
        .addField('📝 Şu Anki İsim', target.displayName, false)
        .setFooter({ text: '⚽ Futbol Kayıt Sistemi • Kullanıcı Geçmişi' })
        .setTimestamp();
      
      // Add current roles
      const roles = target.roles.cache
        .filter(role => role.id !== message.guild.id) // Filter out @everyone role
        .sort((a, b) => b.position - a.position) // Sort by position (highest first)
        .map(role => `<@&${role.id}>`)
        .join(', ');
      
      embed.addField('🛡️ Mevcut Roller', roles || 'Rol yok', false);
      
      // Add previous registrations if any
      if (userRegistrations.length > 0) {
        // Sort by timestamp, newest first
        userRegistrations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        let registrationHistory = '';
        
        userRegistrations.forEach((reg, index) => {
          const date = new Date(reg.timestamp);
          const formattedDate = `<t:${Math.floor(date.getTime() / 1000)}:F>`;
          
          registrationHistory += `**${index + 1}.** İsim: \`${reg.assignedName}\` `;
          registrationHistory += `| Kaydeden: <@${reg.staffId}> `;
          registrationHistory += `| Tarih: ${formattedDate}`;
          
          if (reg.assignedRole) {
            registrationHistory += ` | Rol: <@&${reg.assignedRoleId}>`;
          }
          
          registrationHistory += '\n';
        });
        
        embed.addField(`📋 Kayıt Geçmişi (${userRegistrations.length})`, registrationHistory || 'Kayıt geçmişi bulunamadı.', false);
      } else {
        embed.addField('📋 Kayıt Geçmişi', 'Bu kullanıcı için kayıt geçmişi bulunamadı.', false);
      }
      
      message.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error fetching user history:', error);
      message.reply('❌ Kullanıcı geçmişi alınırken bir hata oluştu!');
    }
  }
};