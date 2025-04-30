const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');
const db = require('../utils/database');

module.exports = {
  name: 'kayit',
  description: 'Register a user with a name and select a role',
  async execute(message, args, client) {
    // Get server settings from database
    const guildId = message.guild.id;
    const settings = await db.getGuildSettings(guildId);
    
    if (!settings) {
      return message.reply('❓ Kayıt sistemi kurulmamış! Lütfen önce `.kayıtkur` komutunu kullanın.');
    }
    
    // Check if user has permission to use this command
    if (settings.yetkiliRole && !message.member.roles.cache.has(settings.yetkiliRole) && !message.member.permissions.has('ADMINISTRATOR')) {
      return message.reply('🚫 Bu komutu kullanmak için yetkili olmalısınız!');
    }

    // Check if the command has the correct format
    if (args.length < 2) {
      return message.reply('ℹ️ Doğru kullanım: `.k @kullanıcı isim`');
    }

    // Get the mentioned user
    const target = message.mentions.members.first();
    if (!target) {
      return message.reply('⚠️ Lütfen bir kullanıcı etiketleyin!');
    }

    // Extract name from args (everything after the mention)
    const name = args.slice(1).join(' ');
    
    try {
      // Set nickname (without emoji)
      await target.setNickname(name);
      
      // Remove "Kayıtsız" role if exists
      if (settings.kayitsizRole && target.roles.cache.has(settings.kayitsizRole)) {
        await target.roles.remove(settings.kayitsizRole);
      }
      
      // Automatically add the member role if configured
      if (settings.uyeRole && settings.autoAssignUyeRole) {
        const uyeRole = message.guild.roles.cache.get(settings.uyeRole);
        if (uyeRole) {
          await target.roles.add(uyeRole);
          if (settings.logChannel) {
            const logChannel = message.guild.channels.cache.get(settings.logChannel);
            if (logChannel) {
              logChannel.send(`👥 <@${target.id}> kullanıcısına otomatik olarak <@&${uyeRole.id}> rolü verildi.`);
            }
          }
        }
      }
      
      // Create role selection buttons with emojis (Row 1)
      const row1 = new MessageActionRow()
        .addComponents(
          new MessageButton()
            .setCustomId(`role_futbolcu_${target.id}`)
            .setLabel('⚽ Futbolcu')
            .setStyle('PRIMARY'),
          new MessageButton()
            .setCustomId(`role_teknikdirektor_${target.id}`)
            .setLabel('📋 Teknik Direktör')
            .setStyle('SUCCESS'),
          new MessageButton()
            .setCustomId(`role_baskan_${target.id}`)
            .setLabel('👑 Başkan')
            .setStyle('DANGER')
        );
        
      // Create second row of buttons (Row 2)
      const row2 = new MessageActionRow()
        .addComponents(
          new MessageButton()
            .setCustomId(`role_taraftar_${target.id}`)
            .setLabel('🏟️ Taraftar')
            .setStyle('PRIMARY'),
          new MessageButton()
            .setCustomId(`role_bayan_${target.id}`)
            .setLabel('👩 Bayan Üye')
            .setStyle('DANGER'),
          new MessageButton()
            .setCustomId(`role_partner_${target.id}`)
            .setLabel('🤝 Partner')
            .setStyle('SECONDARY')
        );

      // Create embed for registration
      const registerEmbed = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle('👤 Kullanıcı Kaydı')
        .setDescription(`**${name}** kullanıcısı için bir rol seçin!`)
        .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
        .addField('🆔 Kullanıcı', `<@${target.id}>`, true)
        .addField('📝 Kayıt Eden', `<@${message.author.id}>`, true)
        .addField('⏰ Kayıt Zamanı', new Date().toLocaleString('tr-TR'), true)
        .setFooter({ text: 'Futbol Kayıt Sistemi' })
        .setTimestamp();

      // Send message with buttons and embed
      await message.reply({ 
        embeds: [registerEmbed],
        components: [row1, row2]
      });
      
      // Kayıt verilerini veritabanına ekle
      const registrationData = {
        guildId: guildId,
        memberId: target.id,
        memberName: target.user.tag,
        staffId: message.author.id,
        staffName: message.author.tag,
        timestamp: new Date().toISOString(),
        assignedName: name
      };
      
      // Veritabanına kaydet
      await db.addRegistration(registrationData);
      
      // Genel log kanalına mesaj gönder
      if (settings.logChannel) {
        const logChannel = message.guild.channels.cache.get(settings.logChannel);
        if (logChannel) {
          const logEmbed = new MessageEmbed()
            .setTitle('📝 Kullanıcı Kaydı Yapıldı')
            .setColor('#2ecc71')
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
            .addField('👤 Kullanıcı', `<@${target.id}> (\`${target.user.tag}\`)`, false)
            .addField('✏️ Yeni İsim', `\`${name}\``, false)
            .addField('👮 Kaydeden Yetkili', `<@${message.author.id}> (\`${message.author.tag}\`)`, false)
            .addField('⏰ Zaman', `\`${new Date().toLocaleString('tr-TR')}\``, false)
            .setFooter({ text: `ID: ${target.id} • Kayıt Logu` })
            .setTimestamp();
            
          await logChannel.send({ embeds: [logEmbed] });
        }
      }
      
      // Send a welcome message to the user
      try {
        await target.send({
          embeds: [
            new MessageEmbed()
              .setColor('#00ff00')
              .setTitle('🎉 Hoş Geldin!')
              .setDescription(`**${message.guild.name}** sunucusuna hoş geldin! Kaydın yapıldı ve yeni ismin **${name}** olarak ayarlandı.`)
              .addField('💬 Bilgi', 'Yetkili ekibimiz yakında sana bir rol atayacak.')
              .setFooter({ text: 'İyi eğlenceler! ⚽' })
          ]
        });
      } catch (dmError) {
        console.log(`DM gönderilemedi: ${dmError}`);
        // Don't worry if DM can't be sent, it's optional
      }
      
      // Log kanalına kayıt mesajı gönder
      if (settings.logChannel) {
        const logChannel = message.guild.channels.cache.get(settings.logChannel);
        if (logChannel) {
          const logEmbed = new MessageEmbed()
            .setTitle('📝 Kullanıcı Kaydı Tamamlandı')
            .setColor('#2ecc71') 
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
            .addField('👤 Kullanıcı', `<@${target.id}> (\`${target.user.tag}\`)`, false)
            .addField('✏️ Yeni İsim', `\`${name}\``, false)
            .addField('👮 Kaydeden Yetkili', `<@${message.author.id}>`, true)
            .addField('⏰ Kayıt Zamanı', new Date().toLocaleString('tr-TR'), true)
            .setFooter({ text: `ID: ${target.id} • Kayıt İşlemi` })
            .setTimestamp();
          
          await logChannel.send({ embeds: [logEmbed] });
        }
      }
      
      // Hoş geldin kanalına kayıt sonrası mesajı gönder
      if (settings.welcomeChannel) {
        const welcomeChannel = message.guild.channels.cache.get(settings.welcomeChannel);
        if (welcomeChannel) {
          const welcomeEmbed = new MessageEmbed()
            .setTitle('🎊 Yeni Üye Aramıza Katıldı!')
            .setColor('#f1c40f')
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
            .setDescription(`**${name}** adlı üye aramıza hoş geldin! Futbol ailemize katıldığın için çok mutluyuz! ⚽`)
            .addField('👤 Kullanıcı', `<@${target.id}>`, true)
            .addField('📝 Kayıt Eden', `<@${message.author.id}>`, true)
            .addField('⏰ Kayıt Zamanı', new Date().toLocaleString('tr-TR'), true)
            .setImage('https://i.imgur.com/3Umh6l4.jpg')
            .setFooter({ text: '⚽ Futbol Kayıt Sistemi • Hoş Geldin!' })
            .setTimestamp();
            
          await welcomeChannel.send({ 
            content: `🎉 Aramıza hoş geldin <@${target.id}>!`,
            embeds: [welcomeEmbed] 
          });
        }
      }
      
    } catch (error) {
      console.error(error);
      message.reply('❌ Kayıt işlemi sırasında bir hata oluştu!');
    }
  }
};
