const { MessageEmbed } = require('discord.js');
const db = require('../utils/database');

module.exports = {
  name: 'rol',
  description: 'Assign a role to a registered user',
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
      return message.reply('ℹ️ Doğru kullanım: `.rol <kullanıcı_id> <rol_adı>`\nÖrnek: `.rol 123456789012345678 futbolcu`');
    }

    const targetId = args[0];
    const roleName = args[1].toLowerCase();
    
    // Get the target user
    const target = message.guild.members.cache.get(targetId);
    if (!target) {
      return message.reply('⚠️ Kullanıcı bulunamadı! Doğru ID girdiğinizden emin olun.');
    }

    try {
      let role;
      let roleTitle;
      
      // Determine which role to assign
      switch (roleName) {
        case 'futbolcu':
          role = message.guild.roles.cache.find(r => r.name.toLowerCase().includes('futbolcu'));
          roleTitle = '⚽ Futbolcu';
          break;
        case 'teknikdirektor':
          role = message.guild.roles.cache.find(r => r.name.toLowerCase().includes('teknik') || r.name.toLowerCase().includes('direktör'));
          roleTitle = '📋 Teknik Direktör';
          break;
        case 'baskan':
          role = message.guild.roles.cache.find(r => r.name.toLowerCase().includes('başkan'));
          roleTitle = '👑 Başkan';
          break;
        case 'taraftar':
          role = message.guild.roles.cache.find(r => r.name.toLowerCase().includes('taraftar'));
          roleTitle = '🏟️ Taraftar';
          break;
        case 'bayan':
          role = message.guild.roles.cache.find(r => r.name.toLowerCase().includes('bayan') || r.name.toLowerCase().includes('kadın'));
          roleTitle = '👩 Bayan Üye';
          break;
        case 'partner':
          role = message.guild.roles.cache.find(r => r.name.toLowerCase().includes('partner'));
          roleTitle = '🤝 Partner';
          break;
        default:
          return message.reply('⚠️ Geçersiz rol! Şu rollerden birini seçin: futbolcu, teknikdirektor, baskan, taraftar, bayan, partner');
      }
      
      if (!role) {
        return message.reply(`⚠️ "${roleTitle}" rolü bulunamadı! Lütfen sunucuda böyle bir rol olduğundan emin olun.`);
      }
      
      // Assign the role
      await target.roles.add(role);
      
      // Update the database
      await db.updateRegistrationRole(guildId, target.id, role.id, role.name);
      
      // Send confirmation
      const embed = new MessageEmbed()
        .setColor('#00ff00')
        .setTitle('✅ Rol Verildi')
        .setDescription(`<@${target.id}> kullanıcısına ${roleTitle} rolü verildi.`)
        .addField('👤 Kullanıcı', `<@${target.id}>`, true)
        .addField('🛡️ Verilen Rol', `<@&${role.id}>`, true)
        .addField('👮 İşlemi Yapan', `<@${message.author.id}>`, true)
        .setFooter('Futbol Kayıt Sistemi')
        .setTimestamp();
        
      message.channel.send(embed);
      
      // Log the action if log channel is configured
      if (settings.logChannel) {
        const logChannel = message.guild.channels.cache.get(settings.logChannel);
        if (logChannel) {
          const logEmbed = new MessageEmbed()
            .setTitle('🛡️ Rol Verildi')
            .setColor('#2ecc71')
            .addField('👤 Kullanıcı', `<@${target.id}> (\`${target.user.tag}\`)`, true)
            .addField('🎭 Rol', `<@&${role.id}> (\`${role.name}\`)`, true)
            .addField('👮 İşlemi Yapan', `<@${message.author.id}> (\`${message.author.tag}\`)`, true)
            .setFooter(`ID: ${target.id} • Rol Atama`)
            .setTimestamp();
            
          logChannel.send(logEmbed);
        }
      }
      
    } catch (error) {
      console.error(error);
      message.reply('❌ Rol verme işlemi sırasında bir hata oluştu!');
    }
  }
};