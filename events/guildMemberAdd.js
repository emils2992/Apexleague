const { MessageEmbed } = require('discord.js');
const db = require('../utils/database');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    const guildId = member.guild.id;
    const settings = await db.getGuildSettings(guildId);
    
    if (!settings) return; // If settings don't exist, do nothing
    
    try {
      // Assign "Kayıtsız" role
      if (settings.kayitsizRole) {
        const kayitsizRole = member.guild.roles.cache.get(settings.kayitsizRole);
        if (kayitsizRole) {
          await member.roles.add(kayitsizRole);
        }
      }
      
      // Change nickname to "Kayıtsız" if enabled
      if (settings.autoNickname) {
        await member.setNickname('Kayıtsız').catch(error => {
          console.error(`Could not set nickname for ${member.user.tag}: ${error}`);
        });
      }
      
      // Send welcome message
      if (settings.welcomeChannel) {
        const welcomeChannel = member.guild.channels.cache.get(settings.welcomeChannel);
        if (welcomeChannel) {
          // Calculate account age
          const createdAt = member.user.createdAt;
          const now = new Date();
          const accountAge = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24)); // In days
          
          // Determine account trust status
          const isTrusted = accountAge > 30; // Account older than 30 days is considered trusted
          
          // Create welcome embed
          const embed = new MessageEmbed()
            .setTitle('Sunucuya Hoş Geldin! ⚽')
            .setDescription(`<@${member.id}>, futbol sunucumuza hoş geldin!`)
            .setColor(isTrusted ? 'GREEN' : 'YELLOW')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addField('📅 Hesap Oluşturulma Tarihi', `${createdAt.toLocaleDateString('tr-TR')}`, true)
            .addField('⏳ Hesap Yaşı', `${accountAge} gün`, true)
            .addField('🛡️ Güvenilirlik Durumu', isTrusted ? 'Güvenilir Hesap ✅' : 'Yeni Hesap ⚠️', true)
            .addField('ℹ️ Kayıt Olmak İçin', 'Lütfen yetkililerin `.k` komutu ile kayıt olmanı bekle.')
            .setFooter({ text: `ID: ${member.id}` })
            .setTimestamp();
            
          await welcomeChannel.send({ embeds: [embed] });
        }
      }
    } catch (error) {
      console.error(`Error handling new member ${member.user.tag}:`, error);
    }
  }
};
