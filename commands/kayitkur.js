const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');
const db = require('../utils/database');

module.exports = {
  name: 'kayitkur',
  description: 'Set up registration system',
  async execute(message, args, client) {
    // Check if user has admin permission
    if (!message.member.permissions.has(8n)) {
      return message.reply('🚫 Bu komutu kullanmak için yönetici yetkisine sahip olmalısınız!');
    }

    const guildId = message.guild.id;
    
    // Check if setup is already done
    const existingSettings = await db.getGuildSettings(guildId);
    if (existingSettings) {
      const confirmRow = new MessageActionRow()
        .addComponents(
          new MessageButton()
            .setCustomId('confirm_reset')
            .setLabel('✅ Evet, Sıfırla')
            .setStyle('DANGER'),
          new MessageButton()
            .setCustomId('cancel_reset')
            .setLabel('❌ İptal')
            .setStyle('SECONDARY')
        );
      
      const confirmMsg = await message.reply({
        content: '⚠️ Kayıt sistemi zaten kurulmuş! Sıfırlamak istiyor musunuz?',
        components: [confirmRow]
      });
      
      // Wait for button interaction
      try {
        const filter = i => i.customId.startsWith('confirm_') && i.user.id === message.author.id;
        const interaction = await confirmMsg.awaitMessageComponent({ filter, time: 30000 });
        
        if (interaction.customId === 'cancel_reset') {
          return await interaction.update({ content: '✋ İşlem iptal edildi.', components: [] });
        }
        
        // Continue if confirmed reset
        await interaction.update({ content: '🔄 Kayıt sistemi sıfırlanıyor...', components: [] });
      } catch (e) {
        return await confirmMsg.edit({ content: '⏱️ İşlem zaman aşımına uğradı.', components: [] });
      }
    }
    
    // Create a setup embed to show progress
    const setupEmbed = new MessageEmbed()
      .setTitle('⚙️ Kayıt Sistemi Kurulumu')
      .setDescription('Kurulum başlatıldı. Adımları takip edin.')
      .setColor('#3498db')
      .addField('📋 Kurulum Adımları', 
      `1️⃣ Kayıtsız Rolü
      2️⃣ Yetkili Rolü
      3️⃣ Futbolcu Rolü
      4️⃣ Taraftar Rolü
      5️⃣ Bayan Üye Rolü
      6️⃣ Teknik Direktör Rolü
      7️⃣ Başkan Rolü
      8️⃣ Partner Rolü
      9️⃣ Üye Rolü (Otomatik Atama)
      🔟 Hoş Geldin Kanalı
      1️⃣1️⃣ Giriş Log Kanalı
      1️⃣2️⃣ Genel Log Kanalı
      1️⃣3️⃣ Otomatik İsim Ayarı`)
      .setFooter({ text: 'Futbol Kayıt Sistemi • Kurulum' })
      .setTimestamp();
    
    const setupMsg = await message.channel.send({ embeds: [setupEmbed] });
    
    // Ask for "Kayıtsız" role
    const kayitsizMsg = await message.channel.send('1️⃣ Lütfen "Kayıtsız" rolünü etiketleyin, "oluştur" yazın veya "geç" yazarak bu adımı atlayabilirsiniz:');
    let kayitsizRole;
    
    try {
      const collected = await message.channel.awaitMessages({
        filter: m => m.author.id === message.author.id,
        max: 1,
        time: 30000,
        errors: ['time']
      });
      
      const response = collected.first();
      
      if (response.content.toLowerCase() === 'geç') {
        await message.channel.send('✅ Kayıtsız rolü ayarlanmadı, bu adım atlandı.');
        kayitsizRole = null;
      } else if (response.content.toLowerCase() === 'oluştur') {
        // Create role if it doesn't exist
        kayitsizRole = await message.guild.roles.create({
          name: '👤 Kayıtsız',
          color: 'GREY',
          reason: 'Kayıt sistemi kurulumu'
        });
        await message.channel.send(`✅ '👤 Kayıtsız' rolü oluşturuldu!`);
      } else {
        const mentionedRole = response.mentions.roles.first();
        if (!mentionedRole) {
          return message.channel.send('❌ Geçerli bir rol etiketlemediniz. Kurulum iptal edildi.');
        }
        kayitsizRole = mentionedRole;
        await message.channel.send(`✅ ${kayitsizRole} rolü seçildi!`);
      }
    } catch (error) {
      return message.channel.send('⏱️ Zaman aşımı! Kurulum iptal edildi.');
    }
    
    // Ask for "Yetkili" role
    const yetkiliMsg = await message.channel.send('2️⃣ Lütfen "Yetkili" rolünü etiketleyin veya "oluştur" yazın:');
    let yetkiliRole;
    
    try {
      const collected = await message.channel.awaitMessages({
        filter: m => m.author.id === message.author.id,
        max: 1,
        time: 30000,
        errors: ['time']
      });
      
      const response = collected.first();
      
      if (response.content.toLowerCase() === 'oluştur') {
        yetkiliRole = await message.guild.roles.create({
          name: '🛡️ Yetkili',
          color: 'ORANGE',
          reason: 'Kayıt sistemi kurulumu'
        });
        await message.channel.send(`✅ '🛡️ Yetkili' rolü oluşturuldu!`);
      } else {
        const mentionedRole = response.mentions.roles.first();
        if (!mentionedRole) {
          return message.channel.send('❌ Geçerli bir rol etiketlemediniz. Kurulum iptal edildi.');
        }
        yetkiliRole = mentionedRole;
        await message.channel.send(`✅ ${yetkiliRole} rolü seçildi!`);
      }
    } catch (error) {
      return message.channel.send('⏱️ Zaman aşımı! Kurulum iptal edildi.');
    }
    
    // Set up roles
    const futbolcuMsg = await message.channel.send('3️⃣ Lütfen "Futbolcu" rolünü etiketleyin veya "oluştur" yazın:');
    let futbolcuRole;
    
    try {
      const collected = await message.channel.awaitMessages({
        filter: m => m.author.id === message.author.id,
        max: 1,
        time: 30000,
        errors: ['time']
      });
      
      const response = collected.first();
      
      if (response.content.toLowerCase() === 'oluştur') {
        futbolcuRole = await message.guild.roles.create({
          name: '⚽ Futbolcu',
          color: 'BLUE',
          reason: 'Kayıt sistemi kurulumu'
        });
        await message.channel.send(`✅ '⚽ Futbolcu' rolü oluşturuldu!`);
      } else {
        const mentionedRole = response.mentions.roles.first();
        if (!mentionedRole) {
          return message.channel.send('❌ Geçerli bir rol etiketlemediniz. Kurulum iptal edildi.');
        }
        futbolcuRole = mentionedRole;
        await message.channel.send(`✅ ${futbolcuRole} rolü seçildi!`);
      }
    } catch (error) {
      return message.channel.send('⏱️ Zaman aşımı! Kurulum iptal edildi.');
    }
    
    // Taraftar role
    const taraftarMsg = await message.channel.send('4️⃣ Lütfen "Taraftar" rolünü etiketleyin veya "oluştur" yazın:');
    let taraftarRole;
    
    try {
      const collected = await message.channel.awaitMessages({
        filter: m => m.author.id === message.author.id,
        max: 1,
        time: 30000,
        errors: ['time']
      });
      
      const response = collected.first();
      
      if (response.content.toLowerCase() === 'oluştur') {
        taraftarRole = await message.guild.roles.create({
          name: '🏟️ Taraftar',
          color: 'PURPLE',
          reason: 'Kayıt sistemi kurulumu'
        });
        await message.channel.send(`✅ '🏟️ Taraftar' rolü oluşturuldu!`);
      } else {
        const mentionedRole = response.mentions.roles.first();
        if (!mentionedRole) {
          return message.channel.send('❌ Geçerli bir rol etiketlemediniz. Kurulum iptal edildi.');
        }
        taraftarRole = mentionedRole;
        await message.channel.send(`✅ ${taraftarRole} rolü seçildi!`);
      }
    } catch (error) {
      return message.channel.send('⏱️ Zaman aşımı! Kurulum iptal edildi.');
    }
    
    // Bayan Üye role
    const bayanMsg = await message.channel.send('5️⃣ Lütfen "Bayan Üye" rolünü etiketleyin veya "oluştur" yazın:');
    let bayanRole;
    
    try {
      const collected = await message.channel.awaitMessages({
        filter: m => m.author.id === message.author.id,
        max: 1,
        time: 30000,
        errors: ['time']
      });
      
      const response = collected.first();
      
      if (response.content.toLowerCase() === 'oluştur') {
        bayanRole = await message.guild.roles.create({
          name: '👩 Bayan Üye',
          color: '#e91e63',
          reason: 'Kayıt sistemi kurulumu'
        });
        await message.channel.send(`✅ '👩 Bayan Üye' rolü oluşturuldu!`);
      } else {
        const mentionedRole = response.mentions.roles.first();
        if (!mentionedRole) {
          return message.channel.send('❌ Geçerli bir rol etiketlemediniz. Kurulum iptal edildi.');
        }
        bayanRole = mentionedRole;
        await message.channel.send(`✅ ${bayanRole} rolü seçildi!`);
      }
    } catch (error) {
      return message.channel.send('⏱️ Zaman aşımı! Kurulum iptal edildi.');
    }
    
    // Similar process for other roles
    const tdMsg = await message.channel.send('6️⃣ Lütfen "Teknik Direktör" rolünü etiketleyin veya "oluştur" yazın:');
    let tdRole;
    
    try {
      const collected = await message.channel.awaitMessages({
        filter: m => m.author.id === message.author.id,
        max: 1,
        time: 30000,
        errors: ['time']
      });
      
      const response = collected.first();
      
      if (response.content.toLowerCase() === 'oluştur') {
        tdRole = await message.guild.roles.create({
          name: '📋 Teknik Direktör',
          color: 'GREEN',
          reason: 'Kayıt sistemi kurulumu'
        });
        await message.channel.send(`✅ '📋 Teknik Direktör' rolü oluşturuldu!`);
      } else {
        const mentionedRole = response.mentions.roles.first();
        if (!mentionedRole) {
          return message.channel.send('❌ Geçerli bir rol etiketlemediniz. Kurulum iptal edildi.');
        }
        tdRole = mentionedRole;
        await message.channel.send(`✅ ${tdRole} rolü seçildi!`);
      }
    } catch (error) {
      return message.channel.send('⏱️ Zaman aşımı! Kurulum iptal edildi.');
    }
    
    // Başkan role
    const baskanMsg = await message.channel.send('7️⃣ Lütfen "Başkan" rolünü etiketleyin veya "oluştur" yazın:');
    let baskanRole;
    
    try {
      const collected = await message.channel.awaitMessages({
        filter: m => m.author.id === message.author.id,
        max: 1,
        time: 30000,
        errors: ['time']
      });
      
      const response = collected.first();
      
      if (response.content.toLowerCase() === 'oluştur') {
        baskanRole = await message.guild.roles.create({
          name: '👑 Başkan',
          color: 'RED',
          reason: 'Kayıt sistemi kurulumu'
        });
        await message.channel.send(`✅ '👑 Başkan' rolü oluşturuldu!`);
      } else {
        const mentionedRole = response.mentions.roles.first();
        if (!mentionedRole) {
          return message.channel.send('❌ Geçerli bir rol etiketlemediniz. Kurulum iptal edildi.');
        }
        baskanRole = mentionedRole;
        await message.channel.send(`✅ ${baskanRole} rolü seçildi!`);
      }
    } catch (error) {
      return message.channel.send('⏱️ Zaman aşımı! Kurulum iptal edildi.');
    }
    
    // Partner role
    const partnerMsg = await message.channel.send('8️⃣ Lütfen "Partner" rolünü etiketleyin veya "oluştur" yazın:');
    let partnerRole;
    
    try {
      const collected = await message.channel.awaitMessages({
        filter: m => m.author.id === message.author.id,
        max: 1,
        time: 30000,
        errors: ['time']
      });
      
      const response = collected.first();
      
      if (response.content.toLowerCase() === 'oluştur') {
        partnerRole = await message.guild.roles.create({
          name: '🤝 Partner',
          color: 'PURPLE',
          reason: 'Kayıt sistemi kurulumu'
        });
        await message.channel.send(`✅ '🤝 Partner' rolü oluşturuldu!`);
      } else {
        const mentionedRole = response.mentions.roles.first();
        if (!mentionedRole) {
          return message.channel.send('❌ Geçerli bir rol etiketlemediniz. Kurulum iptal edildi.');
        }
        partnerRole = mentionedRole;
        await message.channel.send(`✅ ${partnerRole} rolü seçildi!`);
      }
    } catch (error) {
      return message.channel.send('⏱️ Zaman aşımı! Kurulum iptal edildi.');
    }
    
    // Ask for üye role
    const uyeRoleMsg = await message.channel.send('9️⃣ Lütfen kayıt edilen kullanıcılara otomatik olarak atanacak "Üye" rolünü etiketleyin (veya "geç" yazın):');
    let uyeRole = null;
    let autoAssignUyeRole = false;
    
    try {
      const collected = await message.channel.awaitMessages({
        filter: m => m.author.id === message.author.id,
        max: 1,
        time: 30000,
        errors: ['time']
      });
      
      const response = collected.first();
      
      if (response.content.toLowerCase() === 'geç') {
        await message.channel.send('✅ Üye rolü ayarlanmadı, bu adım atlandı.');
      } else {
        uyeRole = response.mentions.roles.first();
        
        if (!uyeRole) {
          await message.channel.send('⚠️ Geçerli bir rol etiketlenmedi, üye rolü ayarlanmadan devam ediliyor.');
        } else {
          const autoAssignMsg = await message.channel.send(`✅ ${uyeRole} rolü üye rolü olarak ayarlandı! Bu rolü kayıt sırasında otomatik olarak atamak istiyor musunuz? (evet/hayır)`);
          
          try {
            const autoAssignCollected = await message.channel.awaitMessages({
              filter: m => m.author.id === message.author.id && ['evet', 'hayır'].includes(m.content.toLowerCase()),
              max: 1,
              time: 30000,
              errors: ['time']
            });
            
            const autoAssignResponse = autoAssignCollected.first();
            autoAssignUyeRole = autoAssignResponse.content.toLowerCase() === 'evet';
            await message.channel.send(`✅ Otomatik üye rolü atama: ${autoAssignUyeRole ? '`Aktif`' : '`Pasif`'}`);
          } catch (autoAssignError) {
            await message.channel.send('⏱️ Zaman aşımı! Otomatik üye rolü atama pasif olarak ayarlandı.');
          }
        }
      }
    } catch (error) {
      await message.channel.send('⏱️ Zaman aşımı! Üye rolü ayarlanmadan devam ediliyor.');
    }
    
    // Ask for welcome channel
    const welcomeMsg = await message.channel.send('🔟 Lütfen hoş geldin mesajlarının gönderileceği kanalı etiketleyin:\n*Bu kanal, kullanıcı kayıt olduktan sonra karşılama mesajlarının gönderileceği kanaldır.*');
    let welcomeChannel;
    
    try {
      const collected = await message.channel.awaitMessages({
        filter: m => m.author.id === message.author.id,
        max: 1,
        time: 30000,
        errors: ['time']
      });
      
      const response = collected.first();
      welcomeChannel = response.mentions.channels.first();
      
      if (!welcomeChannel) {
        return message.channel.send('❌ Geçerli bir kanal etiketlemediniz. Kurulum iptal edildi.');
      }
      await message.channel.send(`✅ ${welcomeChannel} kanalı hoş geldin kanalı olarak ayarlandı!`);
    } catch (error) {
      return message.channel.send('⏱️ Zaman aşımı! Kurulum iptal edildi.');
    }
    
    // Ask for join log channel (optional)
    const joinLogMsg = await message.channel.send('1️⃣1️⃣ Lütfen yeni üye giriş loglarının gönderileceği kanalı etiketleyin (opsiyonel, geçmek için "geç" yazın):\n*Bu kanal, sunucuya yeni bir üye katıldığında yetkilileri etiketleyerek bildirim yapılan kanaldır.*');
    let joinLogChannel = null;
    
    try {
      const collected = await message.channel.awaitMessages({
        filter: m => m.author.id === message.author.id,
        max: 1,
        time: 30000,
        errors: ['time']
      });
      
      const response = collected.first();
      
      if (response.content.toLowerCase() === 'geç') {
        await message.channel.send('✅ Giriş log kanalı ayarlanmadı, bu adım atlandı.');
      } else {
        joinLogChannel = response.mentions.channels.first();
        
        if (!joinLogChannel) {
          await message.channel.send('⚠️ Geçerli bir kanal etiketlenmedi, giriş log kanalı ayarlanmadan devam ediliyor.');
        } else {
          await message.channel.send(`✅ ${joinLogChannel} kanalı giriş log kanalı olarak ayarlandı!`);
        }
      }
    } catch (error) {
      await message.channel.send('⏱️ Zaman aşımı! Giriş log kanalı ayarlanmadan devam ediliyor.');
    }
    
    // Ask for general log channel (optional)
    const logMsg = await message.channel.send('1️⃣2️⃣ Lütfen genel logların gönderileceği kanalı etiketleyin (opsiyonel, geçmek için "geç" yazın):\n*Bu kanal, tüm kayıt işlemlerinin ve rol atamalarının kayıtlarının tutulduğu kanaldır.*');
    let logChannel = null;
    
    try {
      const collected = await message.channel.awaitMessages({
        filter: m => m.author.id === message.author.id,
        max: 1,
        time: 30000,
        errors: ['time']
      });
      
      const response = collected.first();
      
      if (response.content.toLowerCase() === 'geç') {
        await message.channel.send('✅ Log kanalı ayarlanmadı, bu adım atlandı.');
      } else {
        logChannel = response.mentions.channels.first();
        
        if (!logChannel) {
          await message.channel.send('⚠️ Geçerli bir kanal etiketlenmedi, log kanalı ayarlanmadan devam ediliyor.');
        } else {
          await message.channel.send(`✅ ${logChannel} kanalı log kanalı olarak ayarlandı!`);
        }
      }
    } catch (error) {
      await message.channel.send('⏱️ Zaman aşımı! Log kanalı ayarlanmadan devam ediliyor.');
    }
    
    // Ask for auto-nickname setting
    const autoNickMsg = await message.channel.send('1️⃣3️⃣ Yeni üyelerin isimlerini otomatik olarak "Kayıtsız" yapmak istiyor musunuz? (evet/hayır)');
    let autoNickname;
    
    try {
      const collected = await message.channel.awaitMessages({
        filter: m => m.author.id === message.author.id && ['evet', 'hayır'].includes(m.content.toLowerCase()),
        max: 1,
        time: 30000,
        errors: ['time']
      });
      
      const response = collected.first();
      autoNickname = response.content.toLowerCase() === 'evet';
      await message.channel.send(`✅ Otomatik isim değiştirme: ${autoNickname ? '`Aktif`' : '`Pasif`'}`);
    } catch (error) {
      await message.channel.send('⏱️ Zaman aşımı! Otomatik isim değiştirme pasif olarak ayarlandı.');
      autoNickname = false;
    }
    
    // Save settings
    const settings = {
      kayitsizRole: kayitsizRole.id,
      yetkiliRole: yetkiliRole.id,
      futbolcuRole: futbolcuRole.id,
      taraftarRole: taraftarRole ? taraftarRole.id : null,
      bayanUyeRole: bayanRole ? bayanRole.id : null,
      teknikDirektorRole: tdRole.id,
      baskanRole: baskanRole.id,
      partnerRole: partnerRole.id,
      welcomeChannel: welcomeChannel.id,
      autoNickname: autoNickname,
      autoAssignUyeRole: autoAssignUyeRole
    };
    
    // Add üye role if set
    if (uyeRole) {
      settings.uyeRole = uyeRole.id;
    }
    
    // Add log channels if set
    if (joinLogChannel) {
      settings.joinLogChannel = joinLogChannel.id;
    }
    
    if (logChannel) {
      settings.logChannel = logChannel.id;
    }
    
    await db.saveGuildSettings(guildId, settings);
    
    // Send success message with fancy embed
    const embed = new MessageEmbed()
      .setTitle('✅ Kayıt Sistemi Kurulumu Tamamlandı')
      .setDescription('Futbol temalı kayıt sistemi başarıyla kuruldu!')
      .setColor('#2ecc71')
      .setThumbnail('https://i.imgur.com/7HXgvjM.png')
      .addField('👤 Kayıtsız Rolü', `<@&${kayitsizRole.id}>`, true)
      .addField('🛡️ Yetkili Rolü', `<@&${yetkiliRole.id}>`, true)
      .addField('⚽ Futbolcu Rolü', `<@&${futbolcuRole.id}>`, true)
      .addField('🏟️ Taraftar Rolü', taraftarRole ? `<@&${taraftarRole.id}>` : '`Ayarlanmadı`', true)
      .addField('👩 Bayan Üye Rolü', bayanRole ? `<@&${bayanRole.id}>` : '`Ayarlanmadı`', true)
      .addField('📋 Teknik Direktör Rolü', `<@&${tdRole.id}>`, true)
      .addField('👑 Başkan Rolü', `<@&${baskanRole.id}>`, true)
      .addField('🤝 Partner Rolü', `<@&${partnerRole.id}>`, true)
      .addField('👥 Üye Rolü', uyeRole ? `<@&${uyeRole.id}>` : '`Ayarlanmadı`', true)
      .addField('🎉 Hoş Geldin Kanalı', `<#${welcomeChannel.id}>`, true)
      .addField('📥 Giriş Log Kanalı', joinLogChannel ? `<#${joinLogChannel.id}>` : '`Ayarlanmadı`', true)
      .addField('📊 Genel Log Kanalı', logChannel ? `<#${logChannel.id}>` : '`Ayarlanmadı`', true)
      .addField('🔄 Otomatik İsim Değiştirme', autoNickname ? '`Aktif`' : '`Pasif`', true)
      .addField('👥 Otomatik Üye Rolü', autoAssignUyeRole ? '`Aktif`' : '`Pasif`', true)
      .addField('\u200B', '\u200B', true) // Empty field for alignment
      .addField('📝 Kullanım', 'Yeni gelen üyeler otomatik olarak kayıtsız rolü alacak.\nKayıt için `.k @kullanıcı isim` komutunu kullanabilirsiniz.')
      .addField('📋 Kanal Bilgileri', 
      `**Hoş Geldin Kanalı**: Kayıt olduktan sonra karşılama mesajları.
      **Giriş Log Kanalı**: Yeni üye geldiğinde yetkililere bildirim.
      **Genel Log Kanalı**: Tüm kayıt ve rol işlemlerinin kayıtları.`)
      .setFooter({ text: '⚽ Futbol Kayıt Sistemi • Kurulum Tamamlandı' })
      .setTimestamp();
      
    message.channel.send({ embeds: [embed] });
    
    // Delete the setup messages to clean the channel
    setupMsg.delete().catch(() => {});
  }
};
