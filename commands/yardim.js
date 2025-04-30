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
      .setTitle('⚽ Futbol Kayıt Sistemi Yardım')
      .setColor('#3498db')
      .setDescription('Futbol temalı kayıt sistemi. Tüm komutlar ve açıklamaları:')
      .setThumbnail(message.guild.iconURL({ dynamic: true }) || 'https://i.imgur.com/7HXgvjM.png')
      .setFooter({ text: 'Futbol Kayıt Sistemi • Yardım Menüsü' })
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
      '`.top` - En çok kayıt yapan yetkililerin sıralamasını gösterir', false);
    
    // Additional help based on setup status
    if (setupDone) {
      // Add server-specific information
      embed.addField('📋 Sunucu Ayarları', 
        `**Kayıtsız Rolü**: ${settings.kayitsizRole ? `<@&${settings.kayitsizRole}>` : 'Ayarlanmamış'}\n` +
        `**Yetkili Rolü**: ${settings.yetkiliRole ? `<@&${settings.yetkiliRole}>` : 'Ayarlanmamış'}\n` +
        `**Futbolcu Rolü**: ${settings.futbolcuRole ? `<@&${settings.futbolcuRole}>` : 'Ayarlanmamış'}\n` +
        `**Taraftar Rolü**: ${settings.taraftarRole ? `<@&${settings.taraftarRole}>` : 'Ayarlanmamış'}\n` +
        `**Bayan Üye Rolü**: ${settings.bayanUyeRole ? `<@&${settings.bayanUyeRole}>` : 'Ayarlanmamış'}\n` +
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