const { MessageEmbed } = require('discord.js');
const db = require('../utils/database');

module.exports = {
  name: 'top',
  description: 'En çok kayıt yapan yetkililerin sıralamasını gösterir',
  async execute(message, args, client) {
    // Get guild settings
    const guildId = message.guild.id;
    const settings = await db.getGuildSettings(guildId);
    
    if (!settings) {
      return message.reply('❓ Kayıt sistemi kurulmamış! Lütfen önce `.kayıtkur` komutunu kullanın.');
    }
    
    try {
      // Get staff stats (sorted by registration count)
      const staffStats = await db.getStaffStats(guildId);
      
      if (!staffStats || staffStats.length === 0) {
        return message.reply('📊 Henüz hiç kayıt yapılmamış!');
      }
      
      // Create a fancy embed
      const embed = new MessageEmbed()
        .setTitle('⚽ Futbol Kayıt Sıralaması')
        .setColor('#f39c12')
        .setDescription('En çok kayıt yapan yetkililer:')
        .setThumbnail(message.guild.iconURL({ dynamic: true }) || 'https://i.imgur.com/7HXgvjM.png')
        .setFooter({ text: 'Futbol Kayıt Sistemi • Top Sıralama' })
        .setTimestamp();
      
      // Format the leaderboard with medals
      let leaderboard = '';
      
      staffStats.slice(0, 10).forEach((staff, index) => {
        let medal = '';
        if (index === 0) medal = '🥇';
        else if (index === 1) medal = '🥈';
        else if (index === 2) medal = '🥉';
        else medal = `${index + 1}.`;
        
        leaderboard += `${medal} <@${staff.id}> • **${staff.count}** kayıt\n`;
      });
      
      embed.setDescription(leaderboard || 'Henüz kayıt yapılmamış!');
      
      // Get total registrations
      const registrations = await db.getRegistrations(guildId);
      const totalRegistrations = registrations.length;
      
      // Add footer stats
      embed.addField('📊 Toplam İstatistikler', 
        `**Toplam Kayıt**: \`${totalRegistrations}\`
        **Kayıt Yapan Yetkili**: \`${staffStats.length}\`
        **Sunucu Üye Sayısı**: \`${message.guild.memberCount}\``, false);
      
      // Send the embed
      message.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Sıralama hatası:', error);
      message.reply('❌ Sıralama alınırken bir hata oluştu!');
    }
  }
};