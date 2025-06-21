const { MessageEmbed } = require('discord.js');
const db = require('../utils/database');

// Metni belirli uzunlukta kısaltma fonksiyonu
function truncateText(text, maxLength = 1000) {
  if (!text) return 'Bilgi yok';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

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
      console.log(`[DEBUG-GECMIS] Total registrations in database: ${registrations.length}`);
      console.log(`[DEBUG-GECMIS] Looking for member ID: ${target.id}`);
      
      const userRegistrations = registrations.filter(reg => reg.memberId === target.id);
      console.log(`[DEBUG-GECMIS] Found ${userRegistrations.length} registrations for user ${target.user.tag}`);
      
      if (userRegistrations.length > 0) {
        console.log(`[DEBUG-GECMIS] First registration:`, userRegistrations[0]);
      }

      // Create embed for user history
      const embed = new MessageEmbed()
        .setColor('#9b59b6')
        .setTitle('👤 Kullanıcı Geçmişi')
        .setDescription(`**${target.displayName}** kullanıcısının geçmiş bilgileri`)
        .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
        .addField('🆔 Kullanıcı ID', target.id, true)
        .addField('📆 Hesap Oluşturulma', `<t:${Math.floor(target.user.createdTimestamp / 1000)}:F>\n(<t:${Math.floor(target.user.createdTimestamp / 1000)}:R>)`, true)
        .addField('🚪 Sunucuya Katılma', `<t:${Math.floor(target.joinedTimestamp / 1000)}:F>\n(<t:${Math.floor(target.joinedTimestamp / 1000)}:R>)`, true)
        .addField('📝 Şu Anki İsim', target.displayName, false)
        .setFooter({ text: '⚽ Apex Voucher • Kullanıcı Geçmişi' })
        .setTimestamp();

      // Add current roles
      const roles = target.roles.cache
        .filter(role => role.id !== message.guild.id) // Filter out @everyone role
        .sort((a, b) => b.position - a.position) // Sort by position (highest first)
        .map(role => `<@&${role.id}>`)
        .join(', ');

      embed.addField('🛡️ Mevcut Roller', truncateText(roles, 1000) || 'Rol yok', false);

      // Add previous registrations if any
      if (userRegistrations.length > 0) {
        // Sort by timestamp, newest first
        userRegistrations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        let registrationHistory = '';

        // Kayıt geçmişini parçalara ayır
        for (let i = 0; i < Math.min(userRegistrations.length, 10); i++) { // En fazla 10 kayıt göster
          const reg = userRegistrations[i];
          const date = new Date(reg.timestamp);
          const formattedDate = `<t:${Math.floor(date.getTime() / 1000)}:F>`;

          let entryText = `**${i + 1}.** İsim: \`${reg.assignedName}\` `;
          entryText += `| Kaydeden: <@${reg.staffId}> `;
          entryText += `| Tarih: ${formattedDate}`;

          if (reg.assignedRole) {
            // Role emojis mapping
            const roleEmojis = {
              'Futbolcu': '<:futbolcu:1385547729215819906>',
              'Teknik Direktör': '<:teknikdirektor:1385548384017846272>',
              'Başkan': '<:baskan:1385548870523551816>',
              'Partner': '<:partner:1385547942202445966>',
              'Taraftar': '<:taraftar:1385549312607387738>',
              'Bayan Üye': '<:bayanuye:1385548584228884594>',
              'Kayıtsız': '<:kayitsiz:1385549087629250672>'
            };
            const emoji = roleEmojis[reg.assignedRole] || '';
            entryText += ` | Rol: ${emoji} <@&${reg.assignedRoleId}>`;
          }

          entryText += '\n';

          // Karakter sınırını aşmamak için kontrol et
          if ((registrationHistory + entryText).length > 1000) {
            // Sınıra yaklaşıldıysa, bu kayıdı atla ve kalan kayıt sayısını belirt
            registrationHistory += `...ve ${userRegistrations.length - i} kayıt daha.`;
            break;
          }

          registrationHistory += entryText;
        }

        embed.addField(`📋 Kayıt Geçmişi (${userRegistrations.length})`, truncateText(registrationHistory, 1000) || 'Kayıt geçmişi bulunamadı.', false);
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