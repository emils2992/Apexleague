const db = require('../utils/database');
const { MessageEmbed } = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.isButton()) return;
    
    // Handle role assignment buttons
    if (interaction.customId.startsWith('role_')) {
      // Check if user has permission to assign roles
      const guildId = interaction.guild.id;
      const settings = await db.getGuildSettings(guildId);
      
      if (settings && settings.yetkiliRole && 
          !interaction.member.roles.cache.has(settings.yetkiliRole) && 
          !interaction.member.permissions.has('ADMINISTRATOR')) {
        return interaction.reply({ 
          content: '🚫 Bu butonu kullanmak için yetkili olmalısınız!', 
          ephemeral: true 
        });
      }
      
      if (!settings) {
        return interaction.reply({ 
          content: '❓ Kayıt sistemi kurulmamış! Lütfen önce `.kayıtkur` komutunu kullanın.', 
          ephemeral: true 
        });
      }
      
      // Parse the customId to get role type and target user
      const [_, roleType, targetId] = interaction.customId.split('_');
      const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
      
      if (!targetMember) {
        return interaction.reply({ 
          content: '❌ Kullanıcı bulunamadı!', 
          ephemeral: true 
        });
      }
      
      try {
        let roleId;
        let roleName;
        let roleEmoji;
        let roleColor;
        
        // Determine which role to assign with emojis and colors
        switch (roleType) {
          case 'futbolcu':
            roleId = settings.futbolcuRole;
            roleName = 'Futbolcu';
            roleEmoji = '⚽';
            roleColor = '#3498db'; // Blue
            break;
          case 'teknikdirektor':
            roleId = settings.teknikDirektorRole;
            roleName = 'Teknik Direktör';
            roleEmoji = '📋';
            roleColor = '#2ecc71'; // Green
            break;
          case 'baskan':
            roleId = settings.baskanRole;
            roleName = 'Başkan';
            roleEmoji = '👑';
            roleColor = '#e74c3c'; // Red
            break;
          case 'taraftar':
            roleId = settings.taraftarRole;
            roleName = 'Taraftar';
            roleEmoji = '🏟️';
            roleColor = '#9b59b6'; // Purple
            break;
          case 'bayan':
            roleId = settings.bayanRole;
            roleName = 'Bayan Üye';
            roleEmoji = '👩';
            roleColor = '#e91e63'; // Pink
            break;
          case 'partner':
            roleId = settings.partnerRole;
            roleName = 'Partner';
            roleEmoji = '🤝';
            roleColor = '#95a5a6'; // Gray
            break;
          default:
            return interaction.reply({ 
              content: '⚠️ Geçersiz rol tipi!', 
              ephemeral: true 
            });
        }
        
        if (!roleId) {
          return interaction.reply({ 
            content: `❓ ${roleName} rolü ayarlanmamış!`, 
            ephemeral: true 
          });
        }
        
        const role = interaction.guild.roles.cache.get(roleId);
        if (!role) {
          return interaction.reply({ 
            content: `❓ ${roleName} rolü bulunamadı!`, 
            ephemeral: true 
          });
        }
        
        // Assign the role
        await targetMember.roles.add(role);
        
        // Update registration database with role assignment
        await db.updateRegistrationRole(guildId, targetId, role.id, roleName);
        
        // Create a fancy embed for completion
        const successEmbed = new MessageEmbed()
          .setColor(roleColor)
          .setTitle(`${roleEmoji} Rol Ataması Başarılı!`)
          .setDescription(`**${targetMember.displayName}** kullanıcısına **${roleEmoji} ${roleName}** rolü verildi!`)
          .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
          .addField('🆔 Kullanıcı', `<@${targetMember.id}>`, true)
          .addField('🛡️ Verilen Rol', `<@&${role.id}>`, true)
          .addField('👮 İşlemi Yapan', `<@${interaction.user.id}>`, true)
          .setFooter({ text: 'Futbol Kayıt Sistemi • Rol Başarıyla Verildi' })
          .setTimestamp();
        
        // Update the message to show the selection is complete
        await interaction.update({
          content: null,
          embeds: [successEmbed],
          components: []
        });
        
        // Try to send DM to user
        try {
          const dmEmbed = new MessageEmbed()
            .setColor(roleColor)
            .setTitle('🎊 Rol Verildi!')
            .setDescription(`**${interaction.guild.name}** sunucusunda size **${roleEmoji} ${roleName}** rolü verildi!`)
            .addField('💡 Bilgi', 'Artık sunucuda daha fazla erişiminiz var!')
            .setFooter({ text: 'İyi eğlenceler! ⚽' });
            
          await targetMember.send({ embeds: [dmEmbed] });
        } catch (dmError) {
          console.log(`DM gönderilemedi: ${dmError}`);
          // Don't worry if DM fails
        }
        
        // Hoşgeldin kanalına mesaj gönder
        try {
          const guildSettings = await db.getGuildSettings(guildId);
          if (guildSettings && guildSettings.welcomeChannel) {
            const welcomeChannel = interaction.guild.channels.cache.get(guildSettings.welcomeChannel);
            if (welcomeChannel) {
              const welcomeEmbed = new MessageEmbed()
                .setTitle(`${roleEmoji} Yeni ${roleName} Aramıza Katıldı!`)
                .setColor(roleColor)
                .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
                .setDescription(`**${targetMember.displayName}** adlı üye artık bir **${roleEmoji} ${roleName}**! Futbol ailemize katıldığın için çok mutluyuz! ⚽`)
                .addField('👤 Kullanıcı', `<@${targetMember.id}>`, true)
                .addField('🛡️ Verilen Rol', `<@&${role.id}>`, true)
                .addField('👮 İşlemi Yapan', `<@${interaction.user.id}>`, true)
                .setFooter({ text: `⚽ Futbol Kayıt Sistemi • ${roleName} Hoş Geldin!` })
                .setTimestamp();
                
              await welcomeChannel.send({ 
                content: `🎉 Aramıza hoş geldin <@${targetMember.id}>!`,
                embeds: [welcomeEmbed] 
              });
            }
          }
        } catch (welcomeError) {
          console.error('Hoşgeldin mesajı gönderilemedi:', welcomeError);
          // Don't worry if welcome message fails
        }
        
      } catch (error) {
        console.error('Role assignment error:', error);
        return interaction.reply({ 
          content: '❌ Rol verme işlemi sırasında bir hata oluştu!', 
          ephemeral: true 
        });
      }
    }
  }
};
