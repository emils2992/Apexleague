const { MessageEmbed } = require('discord.js');
const db = require('../utils/database');

module.exports = {
  name: 'kayitsayi',
  description: 'Belirtilen kullanıcının kayıt sayılarını rol bazında gösterir',
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
    
    // Kullanıcı kontrolü
    if (args.length < 1) {
      return message.reply('ℹ️ Doğru kullanım: `.kayitsayi @kullanıcı`');
    }
    
    const target = message.mentions.members.first();
    if (!target) {
      return message.reply('⚠️ Lütfen bir kullanıcı etiketleyin!');
    }
    
    try {
      // Kayıt verilerini al
      let registrations = await db.getRegistrations(guildId);
      
      if (!registrations || registrations.length === 0) {
        return message.reply('📊 Henüz hiç kayıt yapılmamış!');
      }
      
      // Belirtilen kullanıcının kayıtlarını filtrele
      const userRegistrations = registrations.filter(reg => 
        reg.staffId === target.id && 
        !reg.unregistered && 
        reg.assignedRole && 
        reg.assignedRoleId
      );
      
      if (userRegistrations.length === 0) {
        return message.reply(`📊 **${target.user.tag}** henüz hiç kayıt yapmamış!`);
      }
      
      // Rol bazında kayıt sayılarını hesapla
      const roleCounts = {};
      const roleNames = {};
      
      userRegistrations.forEach(reg => {
        if (reg.assignedRoleId && reg.assignedRole) {
          if (!roleCounts[reg.assignedRoleId]) {
            roleCounts[reg.assignedRoleId] = 0;
            roleNames[reg.assignedRoleId] = reg.assignedRole;
          }
          roleCounts[reg.assignedRoleId]++;
        }
      });
      
      // .kayitkur komutunda ayarlanan rolleri kontrol et
      const setupRoles = [
        { id: settings.uyeRole, name: 'Futbolcu' },
        { id: settings.coachRole, name: 'Teknik Direktör' },
        { id: settings.presidentRole, name: 'Başkan' },
        { id: settings.partnerRole, name: 'Partner' },
        { id: settings.taraftarRole, name: 'Taraftar' },
        { id: settings.bayanRole, name: 'Bayan Üye' }
      ].filter(role => role.id); // Sadece ayarlanan rolleri al
      
      // Embed oluştur
      const embed = new MessageEmbed()
        .setTitle('📊 Kayıt İstatistikleri')
        .setColor('#3498db')
        .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
        .setDescription(`**${target.user.tag}** kullanıcısının kayıt sayıları:`)
        .setFooter({ text: 'Futbol Kayıt Sistemi • Kayıt Sayıları' })
        .setTimestamp();
      
      let statsText = '';
      let totalCount = 0;
      
      // Sadece .kayitkur'da ayarlanan rollerin istatistiklerini göster
      setupRoles.forEach(setupRole => {
        const count = roleCounts[setupRole.id] || 0;
        const roleObj = message.guild.roles.cache.get(setupRole.id);
        const roleName = roleObj ? roleObj.name : setupRole.name;
        
        statsText += `**${roleName}**: \`${count}\`\n`;
        totalCount += count;
      });
      
      if (statsText === '') {
        statsText = 'Henüz hiç kayıt yapmamış!';
      }
      
      embed.addField('🏆 Rol Bazında Kayıtlar', statsText, false);
      embed.addField('📈 Toplam Kayıt', `\`${totalCount}\``, true);
      embed.addField('👤 Kullanıcı ID', `\`${target.id}\``, true);
      embed.addField('📅 Son Kayıt', userRegistrations.length > 0 ? 
        new Date(userRegistrations[userRegistrations.length - 1].timestamp).toLocaleString('tr-TR') : 
        'Bulunamadı', true);
      
      message.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Kayıt sayısı hatası:', error);
      message.reply('❌ Kayıt sayıları alınırken bir hata oluştu!');
    }
  }
};