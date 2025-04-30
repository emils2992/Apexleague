const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const db = require('../utils/database');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    const guildId = member.guild.id;
    const settings = await db.getGuildSettings(guildId);
    
    if (!settings) return; // If settings don't exist, do nothing
    
    try {
      // Assign "Kayıtsız" role
      if (settings.kayitsizRole) {
        const kayitsizRole = member.guild.roles.cache.get(settings.kayitsizRole);
        if (kayitsizRole) {
          await member.roles.add(kayitsizRole);
        }
      }
      
      // Change nickname to "Kayıtsız" if enabled
      if (settings.autoNickname) {
        await member.setNickname('Kayıtsız').catch(error => {
          console.error(`Could not set nickname for ${member.user.tag}: ${error}`);
        });
      }
      
      // Send detailed welcome message
      if (settings.welcomeChannel) {
        const welcomeChannel = member.guild.channels.cache.get(settings.welcomeChannel);
        if (welcomeChannel) {
          // Calculate account age
          const createdAt = member.user.createdAt;
          const now = new Date();
          const accountAge = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24)); // In days
          
          // Determine account trust status
          const isTrusted = accountAge > 30; // Account older than 30 days is considered trusted
          
          // Get member count
          const totalMembers = member.guild.memberCount;
          
          // Create welcome embed with more details and emojis
          const embed = new MessageEmbed()
            .setTitle('🎊 Sunucuya Yeni Bir Taraftar Katıldı! 🎊')
            .setDescription(`
            **<@${member.id}>** aramıza hoş geldin!
            
            Sen bu sunucunun **${totalMembers}.** üyesisin! 🏟️
            `)
            .setColor(isTrusted ? '#2ecc71' : '#f1c40f')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addField('👤 Kullanıcı Bilgileri', 
            `**Kullanıcı**: <@${member.id}>
            **ID**: \`${member.id}\`
            **Tag**: \`${member.user.tag}\``, false)
            .addField('📅 Hesap Bilgileri', 
            `**Oluşturulma Tarihi**: \`${createdAt.toLocaleDateString('tr-TR')}\`
            **Hesap Yaşı**: \`${accountAge} gün\`
            **Güvenilirlik**: ${isTrusted ? '`✅ Güvenilir Hesap`' : '`⚠️ Yeni Hesap`'}`, false)
            .addField('⚽ Sunucu Bilgileri',
            `**Toplam Üye**: \`${totalMembers}\`
            **Katılma Zamanı**: \`${new Date().toLocaleString('tr-TR')}\`
            **Durum**: \`Kayıtsız\``, false)
            .addField('📢 Bilgilendirme', 
            'Kayıt olmak için yetkililerin `.k` komutu ile kayıt olmanı bekleyebilirsin.\nKayıt olduktan sonra sunucumuzdaki tüm kanallara erişim sağlayabileceksin!', false)
            .setImage('https://i.imgur.com/7HXgvjM.png') // Futbol sahası resmi
            .setFooter({ text: '⚽ Futbol Kayıt Sistemi • Hoş Geldin!' })
            .setTimestamp();
            
          // Get yetkili role if exists
          let yetkiliMention = '';
          if (settings.yetkiliRole) {
            yetkiliMention = `<@&${settings.yetkiliRole}>, `;
          }
          
          // Send the welcome message with yetkili and new member mentions
          await welcomeChannel.send({ 
            content: `🔔 ${yetkiliMention}yeni bir üye geldi! <@${member.id}> aramıza katıldı! Lütfen kayıt işlemlerini yapın!`,
            embeds: [embed] 
          });
          
          // Create a log message for moderators if a join log channel is set
          if (settings.joinLogChannel) {
            const joinLogChannel = member.guild.channels.cache.get(settings.joinLogChannel);
            if (joinLogChannel) {
              const joinLogEmbed = new MessageEmbed()
                .setTitle('📥 Sunucuya Yeni Üye Katıldı')
                .setColor('#3498db')
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .addField('👤 Kullanıcı', `<@${member.id}> (\`${member.user.tag}\`)`, false)
                .addField('🔍 Detaylar', 
                `**ID**: \`${member.id}\`
                **Oluşturulma**: \`${createdAt.toLocaleDateString('tr-TR')}\`
                **Güvenilirlik**: ${isTrusted ? '`✅ Güvenilir`' : '`⚠️ Şüpheli`'}`, false)
                .addField('📊 Sunucu Bilgisi', 
                `**Toplam Üye**: \`${totalMembers}\`
                **Katılma Zamanı**: \`${new Date().toLocaleString('tr-TR')}\``, false)
                .setFooter({ text: `ID: ${member.id} • Giriş Logu` })
                .setTimestamp();
                
              await joinLogChannel.send({ 
                content: `🔔 ${yetkiliMention}<@${member.id}> sunucuya katıldı!`,
                embeds: [joinLogEmbed] 
              });
            }
          }
          
          // Also send to general log channel if exists
          if (settings.logChannel) {
            const logChannel = member.guild.channels.cache.get(settings.logChannel);
            if (logChannel && (!settings.joinLogChannel || settings.joinLogChannel !== settings.logChannel)) {
              const logEmbed = new MessageEmbed()
                .setTitle('👋 Yeni Üye Katıldı')
                .setColor('#3498db')
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .addField('👤 Kullanıcı', `<@${member.id}> (\`${member.user.tag}\`)`, false)
                .addField('🔍 Detaylar', 
                `**ID**: \`${member.id}\`
                **Oluşturulma**: \`${createdAt.toLocaleDateString('tr-TR')}\`
                **Güvenilirlik**: ${isTrusted ? '`✅ Güvenilir`' : '`⚠️ Şüpheli`'}`, false)
                .addField('⏰ Zaman', `\`${new Date().toLocaleString('tr-TR')}\``, false)
                .setFooter({ text: `ID: ${member.id} • Genel Log` })
                .setTimestamp();
                
              await logChannel.send({ embeds: [logEmbed] });
            }
          }
          
          // Try to send welcome DM to the user
          try {
            const dmEmbed = new MessageEmbed()
              .setTitle('⚽ Hoş Geldin!')
              .setColor('#2ecc71')
              .setDescription(`**${member.guild.name}** sunucusuna hoş geldin!`)
              .addField('💬 Bilgilendirme', 
              'Sunucumuza kayıt olmak için yetkililerin seni kaydetmesini beklemen gerekiyor.\nKayıt olduktan sonra tüm kanalları görebileceksin!')
              .setFooter({ text: 'Futbol Kayıt Sistemi' })
              .setTimestamp();
              
            await member.send({ embeds: [dmEmbed] });
          } catch (dmError) {
            console.log(`DM gönderilemedi: ${dmError}`);
            // Don't worry if DM fails
          }
        }
      }
    } catch (error) {
      console.error(`Error handling new member ${member.user.tag}:`, error);
    }
  }
};
