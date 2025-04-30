const db = require('../utils/database');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.isButton()) return;
    
    // Handle role assignment buttons
    if (interaction.customId.startsWith('role_')) {
      // Check if user has permission to assign roles
      if (!interaction.member.permissions.has('MANAGE_ROLES')) {
        return interaction.reply({ 
          content: 'Bu butonu kullanmak için yetkiniz bulunmuyor!', 
          ephemeral: true 
        });
      }
      
      const guildId = interaction.guild.id;
      const settings = await db.getGuildSettings(guildId);
      
      if (!settings) {
        return interaction.reply({ 
          content: 'Kayıt sistemi kurulmamış! Lütfen önce `.kayıtkur` komutunu kullanın.', 
          ephemeral: true 
        });
      }
      
      // Parse the customId to get role type and target user
      const [_, roleType, targetId] = interaction.customId.split('_');
      const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
      
      if (!targetMember) {
        return interaction.reply({ 
          content: 'Kullanıcı bulunamadı!', 
          ephemeral: true 
        });
      }
      
      try {
        let roleId;
        let roleName;
        
        // Determine which role to assign
        switch (roleType) {
          case 'futbolcu':
            roleId = settings.futbolcuRole;
            roleName = 'Futbolcu';
            break;
          case 'teknikdirektor':
            roleId = settings.teknikDirektorRole;
            roleName = 'Teknik Direktör';
            break;
          case 'baskan':
            roleId = settings.baskanRole;
            roleName = 'Başkan';
            break;
          case 'partner':
            roleId = settings.partnerRole;
            roleName = 'Partner';
            break;
          default:
            return interaction.reply({ 
              content: 'Geçersiz rol tipi!', 
              ephemeral: true 
            });
        }
        
        if (!roleId) {
          return interaction.reply({ 
            content: `${roleName} rolü ayarlanmamış!`, 
            ephemeral: true 
          });
        }
        
        const role = interaction.guild.roles.cache.get(roleId);
        if (!role) {
          return interaction.reply({ 
            content: `${roleName} rolü bulunamadı!`, 
            ephemeral: true 
          });
        }
        
        // Assign the role
        await targetMember.roles.add(role);
        
        // Update the message to show the selection is complete
        await interaction.update({
          content: `✅ **${targetMember.displayName}** kullanıcısına **${roleName}** rolü verildi!`,
          components: []
        });
        
      } catch (error) {
        console.error('Role assignment error:', error);
        return interaction.reply({ 
          content: 'Rol verme işlemi sırasında bir hata oluştu!', 
          ephemeral: true 
        });
      }
    }
  }
};
