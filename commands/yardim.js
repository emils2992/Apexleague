const { MessageEmbed } = require('discord.js');
const db = require('../utils/database');

module.exports = {
  name: 'yardım',
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
      '`.kayitsayi @kullanıcı` (veya `.kayitsayı`) - Kullanıcının rol bazında kayıt sayılarını gösterir', false);
      
    // Ses komutları
    embed.addField('🎤 Ses Komutları', 
      '`.sescek` (veya `.sesçek`) - Botu bulunduğunuz ses kanalına çeker ve kalıcı olarak tutar\n' + 
      '`.sesayril` (veya `.sesayrıl`) - Botu ses kanalından çıkarır ve kalıcı bağlantıyı durdurur', false);
    
    // Command aliases
    embed.addField('🔄 Komut Alternatifleri', 
      '**Yardım**: `.yardım` veya `.yardim`\n' +
      '**Ses Çek**: `.sescek` veya `.sesçek`\n' +
      '**Ses Ayrıl**: `.sesayril` veya `.sesayrıl`\n' +
      '**Kayıt Sayısı**: `.kayitsayi` veya `.kayitsayı`', false);
    
    // Additional help based on setup status
    if (setupDone) {
      // Add server-specific information
      embed.addField('📋 Sunucu Ayarları', 
        `**<:kayitsiz:1385549087629250672> Kayıtsız Rolü**: ${settings.kayitsizRole ? `<@&${settings.kayitsizRole}>` : 'Ayarlanmamış'}\n` +
        `**<:yetkili:1385565783307980852> Yetkili Rolü**: ${settings.yetkiliRole ? `<@&${settings.yetkiliRole}>` : 'Ayarlanmamış'}\n` +
        `**<:futbolcu:1385547729215819906> Futbolcu Rolü**: ${settings.futbolcuRole ? `<@&${settings.futbolcuRole}>` : 'Ayarlanmamış'}\n` +
        `**<:teknikdirektor:1385548384017846272> Teknik Direktör Rolü**: ${settings.teknikDirektorRole ? `<@&${settings.teknikDirektorRole}>` : (settings.tdRole ? `<@&${settings.tdRole}>` : 'Ayarlanmamış')}\n` +
        `**<:baskan:1385548870523551816> Başkan Rolü**: ${settings.baskanRole ? `<@&${settings.baskanRole}>` : 'Ayarlanmamış'}\n` +
        `**<:taraftar:1385549312607387738> Taraftar Rolü**: ${settings.taraftarRole ? `<@&${settings.taraftarRole}>` : 'Ayarlanmamış'}\n` +
        `**<:bayanuye:1385548584228884594> Bayan Üye Rolü**: ${settings.bayanUyeRole ? `<@&${settings.bayanUyeRole}>` : (settings.bayanRole ? `<@&${settings.bayanRole}>` : 'Ayarlanmamış')}\n` +
        `**<:partner:1385547942202445966> Partner Rolü**: ${settings.partnerRole ? `<@&${settings.partnerRole}>` : 'Ayarlanmamış'}\n` +
        `**<:uye:1385550973040066651> Üye Rolü**: ${settings.uyeRole ? `<@&${settings.uyeRole}>` : 'Ayarlanmamış'}\n` +
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