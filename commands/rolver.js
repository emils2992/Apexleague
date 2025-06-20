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
      return message.reply('<a:red:1385549644528926730> Bu komutu kullanmak için yetkili olmalısınız!');
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
      return message.reply('<a:red:1385549644528926730> Botlara rol verilemez!');
    }

    // Kendi kendine rol veremez
    if (target.id === message.author.id) {
      return message.reply('<a:red:1385549644528926730> Kendinize rol veremezsiniz!');
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
      return message.reply('<:red:1385549644528926730> Belirtilen rol bulunamadı!');
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
        return message.reply('<a:red:1385549644528926730> Bu kullanıcıya rol veremezsiniz! (Yetki hiyerarşisi)');
      }

      // Komut kullanan kişi, vereceği rolden düşük yetkili olamaz
      if (authorHighestRole.position <= roleToGive.position) {
        return message.reply('<a:red:1385549644528926730> Bu rolü veremezsiniz! (Rol yetkinizden yüksek)');
      }
    }

    // Bot yetki kontrolü
    if (botMember.roles.highest.position <= targetRole.position) {
      return message.reply('<a:red:1385549644528926730> Bu rolü veremem! Bot rolü yeterince yüksek değil.');
    }

    // Kullanıcıda bu rol zaten var mı?
    if (target.roles.cache.has(targetRole.id)) {
      return message.reply(`<a:red:1385549644528926730> ${target.displayName} kullanıcısında **${targetRole.name}** rolü zaten mevcut!`);
    }

    try {
      // Rolü ver
      await target.roles.add(targetRole, `Rol verildi: ${message.author.tag} tarafından`);

      // Başarı mesajı
      const successMessage = `<a:green:1385549530099744878> **${target.displayName}** kullanıcısına **${targetRole.name}** rolü başarıyla verildi!`;
      
      message.reply(successMessage);

      // Log kanalına bildirim gönder
      if (settings.logChannel) {
        const logChannel = message.guild.channels.cache.get(settings.logChannel);
        if (logChannel) {
          const logMessage = `📋 **Rol Verildi**
<:green:1385549530099744878> **Kullanıcı**: ${target} (${target.user.tag})
<:role:1385550203842396180> **Verilen Rol**: ${targetRole}
<:yetkili:1385549976543580221> **Yetkili**: ${message.author} (${message.author.tag})
<:time:1385550376085901312> **Tarih**: <t:${Math.floor(Date.now() / 1000)}:F>`;

          logChannel.send(logMessage).catch(console.error);
        }
      }

    } catch (error) {
      console.error('Rol verme hatası:', error);
      message.reply('<a:red:1385549644528926730> Rol verilirken bir hata oluştu! Botun yetkileri kontrol edin.');
    }
  }
};