const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const db = require('../utils/database');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    const guildId = member.guild.id;
    const settings = await db.getGuildSettings(guildId);
    
    if (!settings) return; // If settings don't exist, do nothing
    
    try {
      // Bot kontrolü - eğer bot ise hiçbir kayıt işlemi yapma
      if (member.user.bot) {
        console.log(`[BOT] ${member.user.tag} sunucuya katıldı. Bot olduğu için kayıt işlemi yapılmadı.`);
        return;
      }
      
      // Assign "Kayıtsız" role to humans only
      if (settings.kayitsizRole) {
        const kayitsizRole = member.guild.roles.cache.get(settings.kayitsizRole);
        if (kayitsizRole) {
          try {
            // Botun rolü ile kullanıcıya verilecek rolün hiyerarşisini kontrol et
            const botMember = member.guild.me;
            const botRole = botMember.roles.highest;
            
            if (botRole.position <= kayitsizRole.position) {
              // Bot rolü, Kayıtsız rolünden daha aşağıda veya aynı seviyede
              if (settings.logChannel) {
                const logChannel = member.guild.channels.cache.get(settings.logChannel);
                if (logChannel) {
                  await logChannel.send({
                    content: `\u26a0️ **Uyarı:** Botun rolü, Kayıtsız rolünden daha aşağıda! <@${member.id}> kişisine rol atayabilmem için lütfen bot rolünü daha üste taşıyın.`
                  });
                }
              }
              console.log(`[HATA] Rol hiyerarşisi sorunu: Botun rolü (${botRole.name}) Kayıtsız rolünden (${kayitsizRole.name}) daha aşağıda!`);
            } else {
              await member.roles.add(kayitsizRole);
            }
          } catch (roleError) {
            console.error(`Kayıtsız rolü verme hatası: ${roleError}`);
            // Log kanalına hata mesajı gönder
            if (settings.logChannel) {
              const logChannel = member.guild.channels.cache.get(settings.logChannel);
              if (logChannel) {
                await logChannel.send({
                  content: `\u26a0️ **Uyarı:** <@${member.id}> kişisine Kayıtsız rolü verilemedi. Lütfen botun rolünü sunucudaki diğer rollerden daha üste taşıyın.`
                });
              }
            }
          }
        }
      }
      
      // Change nickname to "Kayıtsız" if enabled (for humans only)
      if (settings.autoNickname) {
        await member.setNickname('Kayıtsız').catch(error => {
          console.error(`Could not set nickname for ${member.user.tag}: ${error}`);
        });
      }
      
      // Hoş geldin mesajı kayıt işleminden sonra gönderilecek, yeni üye geldiğinde hoş geldin kanalına mesaj göndermiyoruz
      
      // Calculate account age for log channels
      const createdAt = member.user.createdAt;
      const now = new Date();
      const accountAge = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24)); // In days
      
      // Determine account trust status
      const isTrusted = accountAge > 30; // Account older than 30 days is considered trusted
      
      // Get member count
      const totalMembers = member.guild.memberCount;
      
      // Get yetkili role if exists
      let yetkiliMention = '';
      if (settings.yetkiliRole) {
        yetkiliMention = `<@&${settings.yetkiliRole}>, `;
      }
      
      // Create a log message for moderators if a join log channel is set
      if (settings.joinLogChannel) {
        const joinLogChannel = member.guild.channels.cache.get(settings.joinLogChannel);
        if (joinLogChannel) {
          // Calculate account creation timestamp
          const createdTimestamp = Math.floor(member.user.createdTimestamp / 1000);
          
          // Create the message content in your requested format
          const messageContent = `> <:uye:1385550973040066651> (<@${member.id}>, **${member.guild.name}**) Sunucusuna Hoş Geldin, Seninle Birlikte (${totalMembers}) Kişiye Ulaştık <a:kalp:1385554933373341757>

> <a:sure:1385555246314688543> Hesap (**<t:${createdTimestamp}>) Tarihinde <t:${createdTimestamp}:R>**) Oluşturulmuş, (${isTrusted ? '<a:onay:1385553560678305872> **Güvenli**' : '<a:red:1385554348456542258> **Güvensiz**'})

> <a:buyutec:1385554672562995295> (${yetkiliMention.replace(', ', '')})
\`\`\`Sunucuya Erişebilmek İçin "Kayıt" Yerlerinde Ne Olacağın Hakkında Bilgi Vererek İçeri Giriş Yapabilirsin, Kuralları Okumayı Unutma.\`\`\``;
            
          await joinLogChannel.send({ 
            content: messageContent
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
          .setTitle('<a:hosgeldin:1385547269360713779> Hoş Geldin!')
          .setColor('#2ecc71')
          .setDescription(`**${member.guild.name}** sunucusuna hoş geldin!`)
          .addField('💬 Bilgilendirme', 
          'Sunucumuza kayıt olmak için yetkililerin seni kaydetmesini beklemen gerekiyor.\nKayıt olduktan sonra tüm kanalları görebileceksin!')
          .setFooter({ text: 'Apex Voucher' })
          .setTimestamp();
          
        await member.send({ embeds: [dmEmbed] });
      } catch (dmError) {
        console.log(`DM gönderilemedi: ${dmError}`);
        // Don't worry if DM fails
      }
    } catch (error) {
      console.error(`Error handling new member ${member.user.tag}:`, error);
    }
  }
};
