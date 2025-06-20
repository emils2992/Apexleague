const { MessageEmbed } = require('discord.js');
const db = require('../utils/database');

module.exports = {
  name: 'yardim',
  description: 'Botun komutlarını ve kullanımını gösterir',
  async execute(message, args, client) {
    // Get guild settings
    const guildId = message.guild.id;
    const settings = await db.getGuildSettings(guildId);
    
    // Check if setup is done
    const setupDone = settings ? true : false;
    
    // Create a fancy embed for help
    const embed = new MessageEmbed()
      .setTitle('⚽ Apex Voucher Yardım')
      .setColor('#3498db')
      .setDescription('Futbol temalı kayıt sistemi. Tüm komutlar ve açıklamaları:')
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: 'Apex Voucher • Yardım Menüsü' })
      .setTimestamp();
    
    // Admin commands
    embed.addField('🛡️ Yönetici Komutları', 
      '`.kayıtkur` - Kayıt sistemini kurar ve ayarları yapılandırır\n' +
      '`.kayıtsıfırla` - Kayıt sistemini sıfırlar', false);
    
    // Staff commands
    embed.addField('👮 Yetkili Komutları', 
      '`.k @kullanıcı isim` - Kullanıcıyı kayıt eder ve isim değiştirir\n' + 
      '`.uk @kullanıcı` - Kullanıcının kaydını sıfırlar ve kayıtsız rolü verir\n' +
      '`.g @kullanıcı` - Kullanıcının geçmiş kayıtlarını ve bilgilerini gösterir\n' +
      '`.id @kullanıcı yeni_isim` - Kullanıcının ismini değiştirir\n' +
      '`.top` - En çok kayıt yapan yetkililerin sıralamasını gösterir\n' +
      '`.kayitsayi @kullanıcı` - veya .kayitsayi yazarakda -Kullanıcının rol bazında kayıt sayılarını gösterir', false);
      
    // Ses komutları
    embed.addField('🎤 Ses Komutları', 
      '`.sescek` - Botu bulunduğunuz ses kanalına çeker\n' + 
      '`.sesayril` - Botu ses kanalından çıkarır', false);
    
    // Additional help based on setup status
    if (setupDone) {
      // Add server-specific information
      embed.addField('📋 Sunucu Ayarları', 
        `**Kayıtsız Rolü**: ${settings.kayitsizRole ? `<@&${settings.kayitsizRole}>` : 'Ayarlanmamış'}\n` +
        `**Yetkili Rolü**: ${settings.yetkiliRole ? `<@&${settings.yetkiliRole}>` : 'Ayarlanmamış'}\n` +
        `**Futbolcu Rolü**: ${settings.futbolcuRole ? `<@&${settings.futbolcuRole}>` : 'Ayarlanmamış'}\n` +
        `**Teknik Direktör Rolü**: ${settings.teknikDirektorRole ? `<@&${settings.teknikDirektorRole}>` : (settings.tdRole ? `<@&${settings.tdRole}>` : 'Ayarlanmamış')}\n` +
        `**Başkan Rolü**: ${settings.baskanRole ? `<@&${settings.baskanRole}>` : 'Ayarlanmamış'}\n` +
        `**Taraftar Rolü**: ${settings.taraftarRole ? `<@&${settings.taraftarRole}>` : 'Ayarlanmamış'}\n` +
        `**Bayan Üye Rolü**: ${settings.bayanUyeRole ? `<@&${settings.bayanUyeRole}>` : (settings.bayanRole ? `<@&${settings.bayanRole}>` : 'Ayarlanmamış')}\n` +
        `**Partner Rolü**: ${settings.partnerRole ? `<@&${settings.partnerRole}>` : 'Ayarlanmamış'}\n` +
        `**Üye Rolü**: ${settings.uyeRole ? `<@&${settings.uyeRole}>` : 'Ayarlanmamış'}\n` +
        `**Otomatik Üye Rolü**: ${settings.autoAssignUyeRole ? '`Aktif`' : '`Pasif`'}\n` +
        `**Hoş Geldin Kanalı**: ${settings.welcomeChannel ? `<#${settings.welcomeChannel}>` : 'Ayarlanmamış'}\n` +
        `**Giriş Log Kanalı**: ${settings.joinLogChannel ? `<#${settings.joinLogChannel}>` : 'Ayarlanmamış'}\n` +
        `**Genel Log Kanalı**: ${settings.logChannel ? `<#${settings.logChannel}>` : 'Ayarlanmamış'}`, false);
      
      // Explain channel purposes
      embed.addField('📢 Kanal Bilgileri', 
        '**Hoş Geldin Kanalı**: Kayıt olduktan sonra kullanıcıların karşılama mesajları bu kanala gönderilir.\n' +
        '**Giriş Log Kanalı**: Yeni üye sunucuya katıldığında yetkilileri etiketleyerek bildirim yapılan kanaldır.\n' +
        '**Genel Log Kanalı**: Tüm kayıt işlemlerinin ve rol atamalarının kayıtları burada tutulur.', false);
    } else {
      // Setup reminder
      embed.addField('⚠️ Kurulum Gerekli', 
        'Kayıt sistemi henüz kurulmamış. Sistemi kurmak için `.kayıtkur` komutunu kullanın.', false);
    }
    
    // Send the help message
    message.reply({ embeds: [embed] });
  }
};