const { MessageEmbed } = require('discord.js');
const db = require('../utils/database');

// Türkçe tarih formatı için yardımcı fonksiyon
function formatTurkishDate(date) {
  const turkishDate = new Date(date.getTime() + (3 * 60 * 60 * 1000)); // UTC+3 Türkiye saati
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Istanbul'
  };
  
  const formatter = new Intl.DateTimeFormat('tr-TR', options);
  return formatter.format(turkishDate);
}

module.exports = {
  name: 'kayitsayi',
  aliases: ['kayıtsayi', 'kayıtsayı', 'kayitsayı'],
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
    
    // Kullanıcı kontrolü - eğer etiket yoksa komutu yazan kişiyi al
    let target;
    if (args.length > 0 && message.mentions.members.first()) {
      target = message.mentions.members.first();
    } else {
      target = message.member;
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
      
      // .kayitkur komutunda ayarlanan rolleri kontrol et - exclude test/admin roles
      const setupRoles = [
        { id: settings.futbolcuRole, name: 'Futbolcu' },
        { id: settings.teknikDirektorRole, name: 'Teknik Direktör' },
        { id: settings.baskanRole, name: 'Başkan' },
        { id: settings.partnerRole, name: 'Partner' },
        { id: settings.bayanUyeRole, name: 'Bayan Üye' }
      ].filter(role => role.id && role.id !== settings.kayitsizRole && role.id !== settings.uyeRole);
      
      // Takım taraftar rollerini ekle
      if (settings.teamRoles) {
        const teams = [
          { key: 'everton', name: 'Everton', emoji: '🔵' },
          { key: 'arsenal', name: 'Arsenal', emoji: '🔴' },
          { key: 'liverpool', name: 'Liverpool', emoji: '🔴' },
          { key: 'city', name: 'Manchester City', emoji: '🔵' },
          { key: 'realmadrid', name: 'Real Madrid', emoji: '⚪' },
          { key: 'psg', name: 'PSG', emoji: '🔴' },
          { key: 'barcelona', name: 'Barcelona', emoji: '🔴' },
          { key: 'leverkusen', name: 'Bayer Leverkusen', emoji: '🔴' }
        ];
        
        teams.forEach(team => {
          if (settings.teamRoles[team.key]) {
            setupRoles.push({ 
              id: settings.teamRoles[team.key], 
              name: `${team.emoji} ${team.name} Taraftarı` 
            });
          }
        });
      }
      
      // Embed oluştur
      const embed = new MessageEmbed()
        .setTitle('📊 Kayıt İstatistikleri')
        .setColor('#3498db')
        .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
        .setDescription(`**${target.user.tag}** kullanıcısının kayıt sayıları:`)
        .setFooter({ text: `Apex Voucher • Kayıt Sayıları • ${formatTurkishDate(new Date())}` });
      
      let statsText = '';
      let totalCount = 0;
      
      // Role emojis mapping
      const roleEmojis = {
        'Futbolcu': '<:futbolcu:1385547729215819906>',
        'Teknik Direktör': '<:teknikdirektor:1385548384017846272>',
        'Başkan': '<:baskan:1385548870523551816>',
        'Partner': '<:partner:1385547942202445966>',
        'Taraftar': '<:taraftar:1385549312607387738>',
        'Bayan Üye': '<:bayanuye:1385548584228884594>'
      };
      
      // Sadece .kayitkur'da ayarlanan rollerin istatistiklerini göster
      setupRoles.forEach(setupRole => {
        const count = roleCounts[setupRole.id] || 0;
        const emoji = roleEmojis[setupRole.name] || '';
        
        statsText += `${emoji} **${setupRole.name}**: \`${count}\`\n`;
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