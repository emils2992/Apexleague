const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const db = require('../utils/database');

// Türkçe tarih formatı için yardımcı fonksiyon
function formatTurkishDate(date) {
  const turkishDate = new Date(date.getTime() + (3 * 60 * 60 * 1000)); // UTC+3 Türkiye saati
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Istanbul'
  };
  
  const formatter = new Intl.DateTimeFormat('tr-TR', options);
  return formatter.format(turkishDate);
}

module.exports = {
  name: 'top',
  description: 'En çok kayıt yapan yetkililerin sıralamasını gösterir',
  async execute(message, args, client) {
    // Get guild settings
    const guildId = message.guild.id;
    const settings = await db.getGuildSettings(guildId);
    
    if (!settings) {
      return message.reply('❓ Kayıt sistemi kurulmamış! Lütfen önce `.kayıtkur` komutunu kullanın.');
    }
    
    // Check if user has permission to use this command
    if (settings.yetkiliRole && !message.member.roles.cache.has(settings.yetkiliRole) && !message.member.permissions.has(8n)) {
      return message.reply('🚫 Bu komutu kullanmak için yetkili olmalısınız!');
    }
    
    try {
      // Get staff stats (sorted by registration count)
      const staffStats = await db.getStaffStats(guildId);
      
      if (!staffStats || staffStats.length === 0) {
        return message.reply('📊 Henüz hiç kayıt yapılmamış!');
      }
      
      // Get registrations for detailed stats
      const registrations = await db.getRegistrations(guildId);
      
      // Calculate detailed stats for each user
      const detailedStats = {};
      staffStats.forEach(staff => {
        const userRegs = registrations.filter(reg => 
          reg.staffId === staff.id && 
          !reg.unregistered && 
          reg.assignedRole && 
          reg.assignedRoleId
        );
        
        const roleCounts = {};
        userRegs.forEach(reg => {
          if (reg.assignedRoleId && reg.assignedRole) {
            roleCounts[reg.assignedRoleId] = (roleCounts[reg.assignedRoleId] || 0) + 1;
          }
        });
        
        // Only count roles that are set up in kayitkur - exclude test/admin roles
        const setupRoles = [
          { id: settings.futbolcuRole, name: 'Futbolcu' },
          { id: settings.teknikDirektorRole, name: 'Teknik Direktör' },
          { id: settings.baskanRole, name: 'Başkan' },
          { id: settings.partnerRole, name: 'Partner' },
          { id: settings.taraftarRole, name: 'Taraftar' },
          { id: settings.bayanUyeRole, name: 'Bayan Üye' }
        ].filter(role => role.id && role.id !== settings.kayitsizRole && role.id !== settings.uyeRole);
        
        let validCount = 0;
        let roleBreakdown = '';
        
        // Role emojis mapping
        const roleEmojis = {
          'Futbolcu': '<:futbolcu:1385547729215819906>',
          'Teknik Direktör': '<:teknikdirektor:1385548384017846272>',
          'Başkan': '<:baskan:1385548870523551816>',
          'Partner': '<:partner:1385547942202445966>',
          'Taraftar': '<:taraftar:1385549312607387738>',
          'Bayan Üye': '<:bayanuye:1385548584228884594>'
        };
        
        setupRoles.forEach(setupRole => {
          const count = roleCounts[setupRole.id] || 0;
          if (count > 0) {
            const roleObj = message.guild.roles.cache.get(setupRole.id);
            const roleName = roleObj ? roleObj.name : setupRole.name;
            const emoji = roleEmojis[setupRole.name] || '';
            roleBreakdown += `${emoji}${count} `;
            validCount += count;
          }
        });
        
        detailedStats[staff.id] = {
          ...staff,
          count: validCount,
          breakdown: roleBreakdown.trim()
        };
      });
      
      // Sort by valid count and filter out users with 0 registrations
      const sortedDetailedStats = Object.values(detailedStats)
        .filter(staff => staff.count > 0)
        .sort((a, b) => b.count - a.count);
      
      // Pagination variables
      const itemsPerPage = 10;
      const totalPages = Math.ceil(sortedDetailedStats.length / itemsPerPage);
      let currentPage = 0;
      
      // Parse page argument if provided
      if (args.length > 0 && !isNaN(args[0])) {
        const requestedPage = parseInt(args[0]) - 1;
        if (requestedPage >= 0 && requestedPage < totalPages) {
          currentPage = requestedPage;
        }
      }
      
      const startIndex = currentPage * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const currentPageData = sortedDetailedStats.slice(startIndex, endIndex);
      
      // Create embed
      const embed = new MessageEmbed()
        .setTitle('⚽ Futbol Kayıt Sıralaması')
        .setColor('#f39c12')

        .setFooter({ text: `Epic League Registration • Sayfa ${currentPage + 1}/${totalPages} • ${formatTurkishDate(new Date())}` })
      
      // Format the leaderboard with medals and role breakdown
      let leaderboard = '';
      
      currentPageData.forEach((staff, index) => {
        const globalIndex = startIndex + index;
        let medal = '';
        if (globalIndex === 0) medal = '🥇';
        else if (globalIndex === 1) medal = '🥈';
        else if (globalIndex === 2) medal = '🥉';
        else medal = `${globalIndex + 1}.`;
        
        leaderboard += `${medal} <@${staff.id}> • **${staff.count}** kayıt\n`;
        if (staff.breakdown) {
          leaderboard += `└ ${staff.breakdown}\n`;
        }
        leaderboard += '\n';
      });
      
      embed.setDescription(leaderboard || 'Henüz kayıt yapılmamış!');
      
      // Add total stats
      const totalRegistrations = sortedDetailedStats.reduce((sum, staff) => sum + staff.count, 0);
      embed.addField('📊 Toplam İstatistikler', 
        `**Toplam Kayıt**: \`${totalRegistrations}\`
        **Kayıt Yapan Yetkili**: \`${sortedDetailedStats.length}\`
        **Sunucu Üye Sayısı**: \`${message.guild.memberCount}\``, false);
      
      // Create navigation buttons if needed
      const components = [];
      if (totalPages > 1) {
        const row = new MessageActionRow();
        
        // Previous button
        if (currentPage > 0) {
          row.addComponents(
            new MessageButton()
              .setCustomId(`top_prev_${currentPage - 1}`)
              .setLabel('◀️ Önceki')
              .setStyle('SECONDARY')
          );
        }
        
        // Page indicator
        row.addComponents(
          new MessageButton()
            .setCustomId('top_page_indicator')
            .setLabel(`${currentPage + 1}/${totalPages}`)
            .setStyle('PRIMARY')
            .setDisabled(true)
        );
        
        // Next button
        if (currentPage < totalPages - 1) {
          row.addComponents(
            new MessageButton()
              .setCustomId(`top_next_${currentPage + 1}`)
              .setLabel('Sonraki ▶️')
              .setStyle('SECONDARY')
          );
        }
        
        components.push(row);
      }
      
      // Send the embed with navigation
      const reply = await message.reply({ 
        embeds: [embed], 
        components: components 
      });
      
      // Handle button interactions
      if (components.length > 0) {
        const filter = (interaction) => {
          return interaction.user.id === message.author.id && 
                 (interaction.customId.startsWith('top_prev_') || 
                  interaction.customId.startsWith('top_next_'));
        };
        
        const collector = reply.createMessageComponentCollector({ 
          filter, 
          time: 300000 // 5 minutes
        });
        
        collector.on('collect', async (interaction) => {
          if (interaction.customId.startsWith('top_prev_')) {
            const newPage = parseInt(interaction.customId.split('_')[2]);
            await this.updateTopPage(interaction, newPage, sortedDetailedStats, settings, message.guild);
          } else if (interaction.customId.startsWith('top_next_')) {
            const newPage = parseInt(interaction.customId.split('_')[2]);
            await this.updateTopPage(interaction, newPage, sortedDetailedStats, settings, message.guild);
          }
        });
        
        collector.on('end', () => {
          // Disable buttons after timeout
          const disabledComponents = components.map(row => {
            const newRow = new MessageActionRow();
            row.components.forEach(button => {
              newRow.addComponents(button.setDisabled(true));
            });
            return newRow;
          });
          
          reply.edit({ components: disabledComponents }).catch(() => {});
        });
      }
      
    } catch (error) {
      console.error('Sıralama hatası:', error);
      message.reply('❌ Sıralama alınırken bir hata oluştu!');
    }
  },
  
  async updateTopPage(interaction, newPage, sortedDetailedStats, settings, guild) {
    const itemsPerPage = 10;
    const totalPages = Math.ceil(sortedDetailedStats.length / itemsPerPage);
    
    const startIndex = newPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPageData = sortedDetailedStats.slice(startIndex, endIndex);
    
    // Create updated embed
    const embed = new MessageEmbed()
      .setTitle('⚽ Futbol Kayıt Sıralaması')
      .setColor('#f39c12')

      .setFooter({ text: `Epic League Registration • Sayfa ${newPage + 1}/${totalPages}` })
      .setTimestamp();
    
    // Format the leaderboard
    let leaderboard = '';
    
    currentPageData.forEach((staff, index) => {
      const globalIndex = startIndex + index;
      let medal = '';
      if (globalIndex === 0) medal = '🥇';
      else if (globalIndex === 1) medal = '🥈';
      else if (globalIndex === 2) medal = '🥉';
      else medal = `${globalIndex + 1}.`;
      
      leaderboard += `${medal} <@${staff.id}> • **${staff.count}** kayıt\n`;
      if (staff.breakdown) {
        leaderboard += `└ ${staff.breakdown}\n`;
      }
      leaderboard += '\n';
    });
    
    embed.setDescription(leaderboard);
    
    // Add total stats
    const totalRegistrations = sortedDetailedStats.reduce((sum, staff) => sum + staff.count, 0);
    embed.addField('📊 Toplam İstatistikler', 
      `**Toplam Kayıt**: \`${totalRegistrations}\`
      **Kayıt Yapan Yetkili**: \`${sortedDetailedStats.length}\`
      **Sunucu Üye Sayısı**: \`${guild.memberCount}\``, false);
    
    // Create navigation buttons
    const row = new MessageActionRow();
    
    // Previous button
    if (newPage > 0) {
      row.addComponents(
        new MessageButton()
          .setCustomId(`top_prev_${newPage - 1}`)
          .setLabel('◀️ Önceki')
          .setStyle('SECONDARY')
      );
    }
    
    // Page indicator
    row.addComponents(
      new MessageButton()
        .setCustomId('top_page_indicator')
        .setLabel(`${newPage + 1}/${totalPages}`)
        .setStyle('PRIMARY')
        .setDisabled(true)
    );
    
    // Next button
    if (newPage < totalPages - 1) {
      row.addComponents(
        new MessageButton()
          .setCustomId(`top_next_${newPage + 1}`)
          .setLabel('Sonraki ▶️')
          .setStyle('SECONDARY')
      );
    }
    
    await interaction.update({ 
      embeds: [embed], 
      components: [row] 
    });
  }
};