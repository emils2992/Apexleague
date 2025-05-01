const { MessageEmbed } = require('discord.js');
const db = require('../utils/database');

module.exports = {
  name: 'topsira',
  description: 'En çok kayıt yapan yetkililerin sıralamasını gösterir',
  async execute(message, args, client) {
    // Yetkili rolü kontrolü
    const guildId = message.guild.id;
    const settings = await db.getGuildSettings(guildId);
    
    if (!settings) {
      return message.reply('❓ Kayıt sistemi kurulmamış! Lütfen önce `.kayıtkur` komutunu kullanın.');
    }
    
    if (settings.yetkiliRole && !message.member.roles.cache.has(settings.yetkiliRole) && !message.member.permissions.has(8n)) {
      return message.reply('🚫 Bu komutu kullanmak için yetkili olmalısınız!');
    }
    
    try {
      // Kayıt verilerini al
      let registrations = await db.getRegistrations(guildId);
      
      if (!registrations || registrations.length === 0) {
        return message.reply('📊 Henüz hiç kayıt yapılmamış!');
      }
      
      // Kullanıcıların kayıt sayılarını topla
      let staffStats = {};
      registrations.forEach(reg => {
        if (!staffStats[reg.staffId]) {
          staffStats[reg.staffId] = {
            count: 0,
            name: reg.staffName || 'Bilinmeyen Yetkili'
          };
        }
        staffStats[reg.staffId].count++;
      });
      
      // Sıralama için dizi oluştur ve sırala
      let sortedStaff = Object.entries(staffStats)
        .map(([id, data]) => ({ id, count: data.count, name: data.name }))
        .sort((a, b) => b.count - a.count);
      
      // İlk 10 alınır
      let topStaff = sortedStaff.slice(0, 10);
      
      // Embed oluştur
      const embed = new MessageEmbed()
        .setTitle('⚽ Futbol Kayıt Sıralaması')
        .setColor('#e74c3c')
        .setDescription('En çok kayıt yapan yetkililer:')
        .setThumbnail('https://i.imgur.com/7HXgvjM.png')
        .setFooter({ text: 'Futbol Kayıt Sistemi • Top Sıralama' })
        .setTimestamp();
      
      // Sıralamayı ekle
      let description = '';
      topStaff.forEach((staff, index) => {
        let medal = '';
        if (index === 0) medal = '🥇';
        else if (index === 1) medal = '🥈';
        else if (index === 2) medal = '🥉';
        else medal = `${index + 1}.`;
        
        description += `${medal} <@${staff.id}> • **${staff.count}** kayıt\n`;
      });
      
      embed.setDescription(description || 'Henüz kayıt yapılmamış!');
      
      // Toplam kayıt sayısını ve sunucu bilgisini ekle
      const totalRegistrations = registrations.length;
      const totalStaff = Object.keys(staffStats).length;
      
      embed.addField('📊 İstatistikler', 
        `**Toplam Kayıt**: \`${totalRegistrations}\`
        **Kayıt Yapan Yetkili**: \`${totalStaff}\`
        **Sunucu ID**: \`${guildId}\``, false);
      
      message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Top sıralama hatası:', error);
      message.reply('❌ Sıralama alınırken bir hata oluştu!');
    }
  }
};