const { MessageEmbed } = require('discord.js');
const db = require('../utils/database');

module.exports = {
  name: 'rolver',
  description: 'Kullanıcıya belirtilen rolü verir',
  async execute(message, args, client) {
    const guildId = message.guild.id;
    const settings = await db.getGuildSettings(guildId);

    if (!settings) {
      return message.reply('❓ Kayıt sistemi kurulmamış! Lütfen önce `.kayıtkur` komutunu kullanın.');
    }

    // Yetki kontrolü
    if (settings.yetkiliRole && !message.member.roles.cache.has(settings.yetkiliRole) && !message.member.permissions.has(8n)) {
      return message.reply('<a:red:1385554348456542258> Bu komutu kullanmak için yetkili olmalısınız!');
    }

    // Komut formatı kontrolü
    if (args.length < 2) {
      return message.reply('ℹ️ Doğru kullanım: `.rolver @kullanıcı @rol` veya `.rolver @kullanıcı rol_adı`');
    }

    // Hedef kullanıcıyı al
    const target = message.mentions.members.first();
    if (!target) {
      return message.reply('⚠️ Lütfen bir kullanıcı etiketleyin!');
    }

    // Bot kendine rol veremez
    if (target.user.bot) {
      return message.reply('<a:red:1385554348456542258> Botlara rol verilemez!');
    }

    // Kendi kendine rol veremez
    if (target.id === message.author.id) {
      return message.reply('<a:red:1385554348456542258> Kendinize rol veremezsiniz!');
    }

    // Rolü bul
    let targetRole = null;
    
    // Önce mention edilen rolü kontrol et
    if (message.mentions.roles.first()) {
      targetRole = message.mentions.roles.first();
    } else {
      // Rol adıyla ara
      const roleName = args.slice(1).join(' ');
      targetRole = message.guild.roles.cache.find(role => 
        role.name.toLowerCase() === roleName.toLowerCase()
      );
    }

    if (!targetRole) {
      return message.reply('<a:red:1385554348456542258> Belirtilen rol bulunamadı!');
    }

    // Yetki hiyerarşisi kontrolü
    const authorMember = message.member;
    const botMember = message.guild.members.cache.get(client.user.id);

    // Yönetici değilse hiyerarşi kontrolü yap
    if (!authorMember.permissions.has(8n)) {
      // Komut kullanan kişinin en yüksek rolü
      const authorHighestRole = authorMember.roles.highest;
      
      // Hedef kullanıcının en yüksek rolü
      const targetHighestRole = target.roles.highest;
      
      // Verilecek rol
      const roleToGive = targetRole;

      // Komut kullanan kişi, hedef kullanıcıdan düşük yetkili olamaz
      if (authorHighestRole.position <= targetHighestRole.position) {
        return message.reply('<a:red:1385554348456542258> Bu kullanıcıya rol veremezsiniz! (Yetki hiyerarşisi)');
      }

      // Komut kullanan kişi, vereceği rolden düşük yetkili olamaz
      if (authorHighestRole.position <= roleToGive.position) {
        return message.reply('<a:red:1385554348456542258> Bu rolü veremezsiniz! (Rol yetkinizden yüksek)');
      }
    }

    // Bot yetki kontrolü
    if (botMember.roles.highest.position <= targetRole.position) {
      return message.reply('<a:red:1385554348456542258> Bu rolü veremem! Bot rolü yeterince yüksek değil.');
    }

    // Kullanıcıda bu rol zaten var mı?
    if (target.roles.cache.has(targetRole.id)) {
      return message.reply(`<a:red:1385554348456542258> ${target.displayName} kullanıcısında **${targetRole.name}** rolü zaten mevcut!`);
    }

    try {
      // Rolü ver
      await target.roles.add(targetRole, `Rol verildi: ${message.author.tag} tarafından`);

      // Başarı mesajı
      const successMessage = `<a:onay:1385553560678305872> **${target.displayName}** kullanıcısına **${targetRole.name}** rolü başarıyla verildi!`;
      
      message.reply(successMessage);

      // Log kanalına bildirim gönder
      if (settings.logChannel) {
        const logChannel = message.guild.channels.cache.get(settings.logChannel);
        if (logChannel) {
          const logEmbed = new MessageEmbed()
            .setColor('#27ae60')
            .setTitle('📋 Rol Verildi')
            .setDescription(`<a:onay:1385553560678305872> **${target.displayName}** kullanıcısına **${targetRole.name}** rolü verildi!`)
            .addFields(
              { name: '<:uye:1385550973040066651> Kullanıcı', value: `${target} (${target.user.tag})`, inline: true },
              { name: '<:roleyetkili:1385586860134240307> Verilen Rol', value: `${targetRole}`, inline: true },
              { name: '<:yetkili:1385565783307980852> Yetkili', value: `${message.author} (${message.author.tag})`, inline: true },
              { name: '<a:sure:1385555246314688543> Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setFooter({ text: 'Epic League Registration • Rol Yönetimi' })
            .setTimestamp();

          logChannel.send({ embeds: [logEmbed] }).catch(console.error);
        }
      }

    } catch (error) {
      console.error('Rol verme hatası:', error);
      message.reply('<a:red:1385554348456542258> Rol verilirken bir hata oluştu! Botun yetkileri kontrol edin.');
    }
  }
};