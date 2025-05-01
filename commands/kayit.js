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
    if (settings.yetkiliRole && !message.member.roles.cache.has(settings.yetkiliRole) && !message.member.permissions.has(8n)) {
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

    // Kullanıcının zaten kayıtlı olup olmadığını kontrol et
    if (settings.uyeRole && target.roles.cache.has(settings.uyeRole)) {
      return message.reply(`❌ **${target.user.tag}** zaten kayıtlı! Kaydını sıfırlamak için önce \`.uk @kullanıcı\` komutunu kullanın.`);
    }

    // Extract name from args (everything after the mention)
    const name = args.slice(1).join(' ');
    
    try {
      // Botun rolü ile kullanıcıya atanacak rollerin hiyerarşisini kontrol et
      const botMember = message.guild.me;
      const botRole = botMember.roles.highest;
      let hierarchyError = false;
      
      // Kayıtsız rolü için kontrol
      if (settings.kayitsizRole) {
        const kayitsizRole = message.guild.roles.cache.get(settings.kayitsizRole);
        if (kayitsizRole && botRole.position <= kayitsizRole.position) {
          hierarchyError = true;
          message.channel.send(`\u26a0️ **Uyarı:** Botun rolü, Kayıtsız rolünden daha aşağıda! Kayıt yapabilmem için lütfen bot rolünü daha üste taşıyın.`);
          console.log(`[HATA] Rol hiyerarşisi sorunu: Botun rolü (${botRole.name}) Kayıtsız rolünden (${kayitsizRole.name}) daha aşağıda!`);
        }
      }
      
      // Üye rolü için kontrol
      if (settings.uyeRole && settings.autoAssignUyeRole) {
        const uyeRole = message.guild.roles.cache.get(settings.uyeRole);
        if (uyeRole && botRole.position <= uyeRole.position) {
          hierarchyError = true;
          message.channel.send(`\u26a0️ **Uyarı:** Botun rolü, Üye rolünden daha aşağıda! Kayıt yapabilmem için lütfen bot rolünü daha üste taşıyın.`);
          console.log(`[HATA] Rol hiyerarşisi sorunu: Botun rolü (${botRole.name}) Üye rolünden (${uyeRole.name}) daha aşağıda!`);
        }
      }
      
      // Eğer rol hiyerarşisi sorunu varsa işlemi durdur
      if (hierarchyError) {
        return message.reply('\u26a0️ Kayıt işlemi durduruldu: Bot rolü, sunucudaki diğer rollerden daha alt sırada. Lütfen bot rolünü yönetici panelinden daha üst sıraya taşıyın!');
      }
      
      // Set nickname (without emoji)
      await target.setNickname(name).catch(nicknameError => {
        console.error(`İsim değiştirme hatası: ${nicknameError}`);
        message.channel.send(`\u26a0️ **Not:** Kullanıcının ismini değiştiremedim. Bu, kullanıcının yetkisi sizden veya bottan yüksek olabilir.`);
      });
      
      // Remove "Kayıtsız" role if exists
      if (settings.kayitsizRole && target.roles.cache.has(settings.kayitsizRole)) {
        await target.roles.remove(settings.kayitsizRole).catch(roleError => {
          console.error(`Kayıtsız rolü kaldırma hatası: ${roleError}`);
          message.channel.send(`\u26a0️ **Not:** Kayıtsız rolünü kaldıramadım. Bot rolünün, rol hiyerarşisinde daha üst sırada olduğundan emin olun.`);
        });
      }
      
      // Automatically add the member role if configured
      if (settings.uyeRole && settings.autoAssignUyeRole) {
        const uyeRole = message.guild.roles.cache.get(settings.uyeRole);
        if (uyeRole) {
          await target.roles.add(uyeRole).catch(roleError => {
            console.error(`Üye rolü ekleme hatası: ${roleError}`);
            message.channel.send(`\u26a0️ **Not:** Üye rolünü ekleyemedim. Bot rolünün, rol hiyerarşisinde daha üst sırada olduğundan emin olun.`);
          });
          // Üye rolü verme mesajı loglara gönderilmeyecek, sadece log embed'ine ekleyeceğiz
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
      
      // (Log mesajı burada gönderilmeyecek - çift gönderim önlemek için)
      
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
