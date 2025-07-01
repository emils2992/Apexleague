const db = require("../utils/database");
const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    if (!interaction.isButton()) return;

    // Handle role assignment buttons
    if (
      interaction.customId.startsWith("role_") ||
      interaction.customId.startsWith("role2_")
    ) {
      // Check if user has permission to assign roles
      const guildId = interaction.guild.id;
      const settings = await db.getGuildSettings(guildId);

      if (
        settings &&
        settings.yetkiliRole &&
        !interaction.member.roles.cache.has(settings.yetkiliRole) &&
        !interaction.member.permissions.has(8n)
      ) {
        // 8n = ADMINISTRATOR in Discord.js v13
        return interaction.reply({
          content: "🚫 Bu butonu kullanmak için yetkili olmalısınız!",
          ephemeral: true,
        });
      }

      if (!settings) {
        return interaction.reply({
          content:
            "❓ Kayıt sistemi kurulmamış! Lütfen önce .kayıtkur komutunu kullanın.",
          ephemeral: true,
        });
      }

      // Parse the customId to get role type and target user
      const parts = interaction.customId.split("_");
      const roleType = parts[1]; // roleType is now the second part (index 1)
      const targetId = parts[parts.length - 1]; // targetId is the last part
      const targetMember = await interaction.guild.members
        .fetch(targetId)
        .catch(() => null);

      if (!targetMember) {
        return interaction.reply({
          content: "❌ Kullanıcı bulunamadı!",
          ephemeral: true,
        });
      }

      // Defer the interaction update to prevent timeout
      await interaction.deferUpdate();

      try {
        let roleId;
        let roleName;
        let roleEmoji;
        let roleColor;

        // Determine which role to assign with emojis and colors
        switch (roleType) {
          case "futbolcu":
            // Show position selection instead of directly assigning futbolcu role
            await showPositionSelection(interaction, targetMember, settings);
            return;
          case "teknikdirektor":
          case "tekdir":
            roleId = settings.teknikDirektorRole;
            roleName = "Teknik Direktör";
            roleEmoji = "<:teknikdirektor:1385548384017846272>";
            roleColor = "#2ecc71"; // Green
            break;
          case "baskan":
            roleId = settings.baskanRole;
            roleName = "Başkan";
            roleEmoji = "<:baskan:1385548870523551816>";
            roleColor = "#e74c3c"; // Red
            break;
          case "taraftar":
            // Show team selection instead of directly assigning taraftar role
            await showTeamSelection(interaction, targetMember, settings);
            return;
          case "bayan":
            roleId = settings.bayanUyeRole;
            roleName = "Bayan Üye";
            roleEmoji = "<:bayanuye:1385548584228884594>";
            roleColor = "#e91e63"; // Pink
            break;
          case "partner":
            roleId = settings.partnerRole;
            roleName = "Partner";
            roleEmoji = "<:partner:1385547942202445966>";
            roleColor = "#95a5a6"; // Gray
            break;
          default:
            return interaction.reply({
              content: "⚠️ Geçersiz rol tipi!",
              ephemeral: true,
            });
        }

        if (!roleId) {
          return interaction.reply({
            content: `❓ ${roleName} rolü ayarlanmamış!`,
            ephemeral: true,
          });
        }

        const role = interaction.guild.roles.cache.get(roleId);
        if (!role) {
          return interaction.reply({
            content: `❓ ${roleName} rolü bulunamadı!`,
            ephemeral: true,
          });
        }

        // Botun rolü ile atanacak rolün hiyerarşisini kontrol et
        const botMember = interaction.guild.me;
        const botRole = botMember.roles.highest;

        if (botRole.position <= role.position) {
          // Bot rolü daha aşağıda, uyarı ver
          await interaction.reply({
            content: `\u26a0️ **Uyarı:** <@&${role.id}> rolünü veremiyorum, çünkü botun rolü daha alt sırada! Lütfen Discord rol ayarlarından bot rolünü daha üste taşıyın.`,
            ephemeral: true,
          });

          // Log kanalına da uyarı gönder
          if (guildSettings.logChannel) {
            const logChannel = interaction.guild.channels.cache.get(
              guildSettings.logChannel,
            );
            if (logChannel) {
              await logChannel.send(
                `\u26a0️ **Uyarı:** <@${interaction.user.id}>, <@${targetId}> kişisine <@&${role.id}> rolünü vermeye çalıştı fakat bot rolü daha alt sırada olduğu için başarısız oldu. Lütfen bot rolünü daha üste taşıyın.`,
              );
            }
          }

          return;
        }

        // Paralel işlemler için promise array
        const rolePromises = [];
        
        // Assign the role
        rolePromises.push(
          targetMember.roles.add(role).catch((error) => {
            console.error(`Rol verme hatası: ${error}`);
            throw error;
          })
        );

        // Ayrıca üye rolü varsa ve otomatik atama ayarlanmışsa, üye rolünü ver
        const guildSettings = await db.getGuildSettings(guildId);
        if (
          guildSettings &&
          guildSettings.uyeRole &&
          guildSettings.autoAssignUyeRole
        ) {
          const uyeRole = interaction.guild.roles.cache.get(
            guildSettings.uyeRole,
          );
          if (uyeRole && !targetMember.roles.cache.has(uyeRole.id)) {
            rolePromises.push(
              targetMember.roles.add(uyeRole).catch((uyeRoleError) => {
                console.error(`Üye rolü verme hatası: ${uyeRoleError}`);
              })
            );
          }
        }

        // Tüm rol işlemlerini paralel çalıştır
        const roleResults = await Promise.allSettled(rolePromises);
        
        // Ana rol ataması başarısız olduysa hata ver
        if (roleResults[0].status === 'rejected') {
          await interaction.editReply({
            content: `⚠️ **Hata:** <@&${role.id}> rolünü vermeye çalışırken bir hata oluştu. Bot rolünün daha üst sırada olduğundan emin olun.`,
            components: [],
          });
          return;
        }

        // Database güncellemesini paralel başlat (beklemeden)
        db.updateRegistrationRole(guildId, targetId, role.id, roleName);

        // Create a fancy embed for completion
        const successEmbed = new MessageEmbed()
          .setColor(roleColor)
          .setTitle(`${roleEmoji} Rol Ataması Başarılı!`)
          .setDescription(
            `**${targetMember.displayName}** kullanıcısına **${roleEmoji} ${roleName}** rolü verildi!`,
          )
          .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
          .addField(
            "<:uye:1385550973040066651> Kullanıcı",
            `<@${targetMember.id}>`,
            true,
          )
          .addField("🛡️ Verilen Rol", `${roleEmoji} <@&${role.id}>`, true)
          .addField("👮 İşlemi Yapan", `<@${interaction.user.id}>`, true)
          .setFooter({ text: "Apex Voucher • Rol Başarıyla Verildi" })
          .setTimestamp();

        // Update the message to show the selection is complete
        await interaction.editReply({
          content: null,
          embeds: [successEmbed],
          components: [],
        });

        // Try to send DM to user
        try {
          const dmEmbed = new MessageEmbed()
            .setColor(roleColor)
            .setTitle("<a:hosgeldin:1385547269360713779> Rol Verildi!")
            .setDescription(
              `**${interaction.guild.name}** sunucusunda size **${roleEmoji} ${roleName}** rolü verildi!`,
            )
            .addField("💡 Bilgi", "Artık sunucuda daha fazla erişiminiz var!")
            .setFooter({ text: "İyi eğlenceler!" });

          await targetMember.send({ embeds: [dmEmbed] });
        } catch (dmError) {
          // DM fails silently
        }

        // Rol atandıktan sonra hoş geldin mesajlarını gönder
        try {
          const guildSettings = await db.getGuildSettings(guildId);

          // Log kanalına rol atama bilgisi gönder
          if (guildSettings && guildSettings.logChannel) {
            const logChannel = interaction.guild.channels.cache.get(
              guildSettings.logChannel,
            );
            if (logChannel) {
              const logEmbed = new MessageEmbed()
                .setTitle(`${roleEmoji} Rol Ataması Yapıldı`)
                .setColor(roleColor)
                .setThumbnail(
                  targetMember.user.displayAvatarURL({ dynamic: true }),
                )
                .setDescription(
                  `**${targetMember.displayName}** kullanıcısına **${roleEmoji} ${roleName}** rolü verildi.`,
                )
                .addField(
                  "<:uye:1385550973040066651> Kullanıcı",
                  `<@${targetMember.id}>`,
                  true,
                )
                .addField("🛡️ Verilen Rol", `${roleEmoji} <@&${role.id}>`, true)
                .addField("👮 İşlemi Yapan", `<@${interaction.user.id}>`, true)
                .setFooter({ text: `⚽ Apex Voucher • Rol Atama` })
                .setTimestamp();

              await logChannel.send({ embeds: [logEmbed] });
            }
          }

          // Hoş geldin kanalına hoş geldin mesajı gönder
          if (guildSettings && guildSettings.welcomeChannel) {
            const welcomeChannel = interaction.guild.channels.cache.get(
              guildSettings.welcomeChannel,
            );
            if (welcomeChannel) {
              const topMessage = `> <@${targetId}> aramıza katıldı.`;

              const mainEmbed = new MessageEmbed()
                .setColor("#000000")
                .setAuthor({
                  name: `${interaction.guild.name} • Kayıt Yapıldı!`
                })
                .setThumbnail(
                  targetMember.user.displayAvatarURL({
                    dynamic: true,
                    size: 128,
                  }),
                )
                .setDescription(
                  `<a:onay1:1385613791911219223> • ** <@${targetId}> aramıza** ${roleEmoji} **${roleName}** *rolüyle katıldı.*\n\n` +
                    `<a:yetkili_geliyor:1385614217884864656> **• Kaydı gerçekleştiren yetkili**\n` +
                    `> <@${interaction.user.id}>\n\n` +
                    `<a:kopek:1385614129514942495> **• Aramıza hoş geldin**\n` +
                    `> <@${targetId}>\n`,
                )
                .setFooter({
                  text: `Apex Voucher • ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`,
                  iconURL: interaction.client.user.displayAvatarURL({
                    dynamic: true,
                    size: 64,
                  }),
                });

              try {
                // Hoşgeldin mesajını gönder
                const welcomeMessage = await welcomeChannel.send({
                  content: topMessage,
                  embeds: [mainEmbed],
                });

                // Mesajı sürekli güncelle (nickname değişikliği için)
                const updateWelcomeMessage = async (attempt = 1) => {
                  try {
                    const updatedMember = await interaction.guild.members.fetch(targetId);
                    const updatedEmbed = new MessageEmbed()
                      .setColor("#000000")
                      .setAuthor({
                        name: `${interaction.guild.name} • Kayıt Yapıldı!`
                      })
                      .setThumbnail(
                        updatedMember.user.displayAvatarURL({
                          dynamic: true,
                          size: 128,
                        }),
                      )
                      .setDescription(
                        `<a:onay1:1385613791911219223> • ** <@${targetId}> aramıza** ${roleEmoji} **${roleName}** *rolüyle katıldı.*\n\n` +
                          `<a:yetkili_geliyor:1385614217884864656> **• Kaydı gerçekleştiren yetkili**\n` +
                          `> <@${interaction.user.id}>\n\n` +
                          `<a:kopek:1385614129514942495> **• Aramıza hoş geldin**\n` +
                          `> <@${targetId}>\n`,
                      )
                      .setFooter({
                        text: `Apex Voucher • ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`,
                        iconURL: interaction.client.user.displayAvatarURL({
                          dynamic: true,
                          size: 64,
                        }),
                      });

                    await welcomeMessage.edit({
                      content: topMessage,
                      embeds: [updatedEmbed],
                    });

                    // 5 denemeye kadar tekrar güncelle
                    if (attempt < 5) {
                      setTimeout(() => updateWelcomeMessage(attempt + 1), 2000);
                    }
                  } catch (updateError) {
                    console.error(`Hoşgeldin mesajı güncellenemedi (deneme ${attempt}):`, updateError);
                  }
                };

                // İlk güncellemeyi 2 saniye sonra başlat
                setTimeout(() => updateWelcomeMessage(), 2000);
              } catch (welcomeError) {
                console.error("Hoşgeldin mesajı gönderilemedi:", welcomeError);
              }
            }
          }
        } catch (logError) {
          console.error("Log mesajı gönderilemedi:", logError);
        }
      } catch (error) {
        console.error("Role assignment error:", error);
        return interaction.reply({
          content: "❌ Rol verme işlemi sırasında bir hata oluştu!",
          ephemeral: true,
        });
      }
    }

    // Handle position selection interactions
    if (interaction.customId.startsWith("position_")) {
      await handlePositionSelection(interaction, client);
      return;
    }

    // Handle team selection interactions
    if (interaction.customId.startsWith("team_")) {
      await handleTeamSelection(interaction, client);
      return;
    }
  },
};

// Function to show position selection buttons
async function showPositionSelection(interaction, targetMember, settings) {
  const positions = [
    { key: 'snt', name: 'Santrafor', emoji: '⚽', roleId: settings.sntRole },
    { key: 'of', name: 'Ofansif Orta Saha', emoji: '🎯', roleId: settings.ofRole },
    { key: 'slk', name: 'Sol Kanat', emoji: '⬅️', roleId: settings.slkRole },
    { key: 'sgk', name: 'Sağ Kanat', emoji: '➡️', roleId: settings.sgkRole },
    { key: 'moo', name: 'Merkez Orta Saha', emoji: '🎪', roleId: settings.mooRole },
    { key: 'mo', name: 'Merkez Orta', emoji: '🎯', roleId: settings.moRole },
    { key: 'mdo', name: 'Merkez Defansif Orta Saha', emoji: '🛡️', roleId: settings.mdoRole },
    { key: 'sgb', name: 'Sağ Bek', emoji: '🔙', roleId: settings.sgbRole },
    { key: 'slb', name: 'Sol Bek', emoji: '🔙', roleId: settings.slbRole },
    { key: 'stp', name: 'Stoper', emoji: '🛡️', roleId: settings.stpRole },
    { key: 'kl', name: 'Kaleci', emoji: '🥅', roleId: settings.klRole }
  ];

  // Filter only available positions (those that have roles set)
  const availablePositions = positions.filter(pos => pos.roleId);

  if (availablePositions.length === 0) {
    await interaction.editReply({
      content: '❌ Hiç futbolcu mevki rolü ayarlanmamış! Lütfen `.kayitkur` komutunu kullanarak mevki rollerini ayarlayın.',
      components: []
    });
    return;
  }

  // Create buttons for positions (max 5 per row, max 3 rows = 15 positions)
  const buttonRows = [];
  const buttonsPerRow = 5;
  
  for (let i = 0; i < availablePositions.length; i += buttonsPerRow) {
    const rowPositions = availablePositions.slice(i, i + buttonsPerRow);
    const row = new MessageActionRow();
    
    for (const position of rowPositions) {
      const button = new MessageButton()
        .setCustomId(`position_${position.key}_${targetMember.id}`)
        .setLabel(position.name)
        .setEmoji(position.emoji)
        .setStyle('SECONDARY');
      
      row.addComponents(button);
    }
    
    buttonRows.push(row);
    
    // Max 3 rows (15 buttons total)
    if (buttonRows.length >= 3) break;
  }

  const positionEmbed = new MessageEmbed()
    .setColor('#3498db')
    .setTitle('⚽ Futbolcu Mevki Seçimi')
    .setDescription(`**${targetMember.displayName}** için bir mevki seçin!`)
    .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: '🆔 Kullanıcı', value: `<@${targetMember.id}>`, inline: true },
      { name: '📝 Kayıt Eden', value: `<@${interaction.user.id}>`, inline: true },
      { name: '⏰ Kayıt Zamanı', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
    )
    .setFooter({ text: 'Apex Voucher • Futbolcu Mevki Seçimi' })
    .setTimestamp();

  await interaction.editReply({
    embeds: [positionEmbed],
    components: buttonRows
  });
}

// Function to handle position selection
async function handlePositionSelection(interaction, client) {
  const parts = interaction.customId.split("_");
  const positionKey = parts[1];
  const targetId = parts[2];
  
  const guildId = interaction.guild.id;
  const settings = await db.getGuildSettings(guildId);
  
  if (!settings) {
    return interaction.reply({
      content: "❓ Kayıt sistemi kurulmamış!",
      ephemeral: true,
    });
  }

  const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
  if (!targetMember) {
    return interaction.reply({
      content: "❌ Kullanıcı bulunamadı!",
      ephemeral: true,
    });
  }

  // Check permissions
  if (
    settings.yetkiliRole &&
    !interaction.member.roles.cache.has(settings.yetkiliRole) &&
    !interaction.member.permissions.has(8n)
  ) {
    return interaction.reply({
      content: "🚫 Bu butonu kullanmak için yetkili olmalısınız!",
      ephemeral: true,
    });
  }

  await interaction.deferUpdate();

  // Position data mapping
  const positionData = {
    'snt': { name: 'Santrafor', emoji: '⚽', roleId: settings.sntRole },
    'of': { name: 'Ofansif Orta Saha', emoji: '🎯', roleId: settings.ofRole },
    'slk': { name: 'Sol Kanat', emoji: '⬅️', roleId: settings.slkRole },
    'sgk': { name: 'Sağ Kanat', emoji: '➡️', roleId: settings.sgkRole },
    'moo': { name: 'Merkez Orta Saha', emoji: '🎪', roleId: settings.mooRole },
    'mo': { name: 'Merkez Orta', emoji: '🎯', roleId: settings.moRole },
    'mdo': { name: 'Merkez Defansif Orta Saha', emoji: '🛡️', roleId: settings.mdoRole },
    'sgb': { name: 'Sağ Bek', emoji: '🔙', roleId: settings.sgbRole },
    'slb': { name: 'Sol Bek', emoji: '🔙', roleId: settings.slbRole },
    'stp': { name: 'Stoper', emoji: '🛡️', roleId: settings.stpRole },
    'kl': { name: 'Kaleci', emoji: '🥅', roleId: settings.klRole }
  };

  const position = positionData[positionKey];
  if (!position || !position.roleId) {
    return interaction.editReply({
      content: `❓ ${positionKey.toUpperCase()} mevki rolü ayarlanmamış!`,
      components: []
    });
  }

  const positionRole = interaction.guild.roles.cache.get(position.roleId);
  if (!positionRole) {
    return interaction.editReply({
      content: `❓ ${position.name} rolü bulunamadı!`,
      components: []
    });
  }

  // Also get the main futbolcu role
  const futbolcuRole = settings.futbolcuRole ? interaction.guild.roles.cache.get(settings.futbolcuRole) : null;

  try {
    const rolePromises = [];
    
    // Add position role
    rolePromises.push(
      targetMember.roles.add(positionRole).catch((error) => {
        console.error(`Mevki rolü verme hatası: ${error}`);
        throw error;
      })
    );

    // Add main futbolcu role if it exists
    if (futbolcuRole && !targetMember.roles.cache.has(futbolcuRole.id)) {
      rolePromises.push(
        targetMember.roles.add(futbolcuRole).catch((error) => {
          console.error(`Futbolcu rolü verme hatası: ${error}`);
        })
      );
    }

    // Add üye role if configured
    if (settings.uyeRole && settings.autoAssignUyeRole) {
      const uyeRole = interaction.guild.roles.cache.get(settings.uyeRole);
      if (uyeRole && !targetMember.roles.cache.has(uyeRole.id)) {
        rolePromises.push(
          targetMember.roles.add(uyeRole).catch((uyeRoleError) => {
            console.error(`Üye rolü verme hatası: ${uyeRoleError}`);
          })
        );
      }
    }

    await Promise.allSettled(rolePromises);

    // Update database
    db.updateRegistrationRole(guildId, targetId, positionRole.id, `${position.name} (Futbolcu)`);

    // Create success embed
    const successEmbed = new MessageEmbed()
      .setColor('#3498db')
      .setTitle(`${position.emoji} Futbolcu Mevki Ataması Başarılı!`)
      .setDescription(
        `**${targetMember.displayName}** kullanıcısına **${position.emoji} ${position.name}** mevki rolü verildi!`
      )
      .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
      .addField(
        "<:uye:1385550973040066651> Kullanıcı",
        `<@${targetMember.id}>`,
        true
      )
      .addField("⚽ Verilen Mevki", `${position.emoji} <@&${positionRole.id}>`, true)
      .addField("👮 İşlemi Yapan", `<@${interaction.user.id}>`, true)
      .setFooter({ text: "Apex Voucher • Futbolcu Mevki Ataması" })
      .setTimestamp();

    await interaction.editReply({
      embeds: [successEmbed],
      components: []
    });

    // Send logs and welcome messages similar to other role assignments
    await sendRoleAssignmentLogs(interaction, targetMember, `${position.emoji} ${position.name}`, positionRole, settings, '#3498db');

  } catch (error) {
    console.error("Position role assignment error:", error);
    return interaction.editReply({
      content: "❌ Mevki rolü verme işlemi sırasında bir hata oluştu!",
      components: []
    });
  }
}

// Helper function for sending logs and welcome messages
async function sendRoleAssignmentLogs(interaction, targetMember, roleName, role, settings, roleColor) {
  const guildId = interaction.guild.id;
  const targetId = targetMember.id;

  try {
    // Send DM to user
    try {
      const dmEmbed = new MessageEmbed()
        .setColor(roleColor)
        .setTitle("<a:hosgeldin:1385547269360713779> Rol Verildi!")
        .setDescription(
          `**${interaction.guild.name}** sunucusunda size **${roleName}** rolü verildi!`
        )
        .addField("💡 Bilgi", "Artık sunucuda daha fazla erişiminiz var!")
        .setFooter({ text: "İyi eğlenceler!" });

      await targetMember.send({ embeds: [dmEmbed] });
    } catch (dmError) {
      // DM fails silently
    }

    // Log channel message
    if (settings.logChannel) {
      const logChannel = interaction.guild.channels.cache.get(settings.logChannel);
      if (logChannel) {
        const logEmbed = new MessageEmbed()
          .setTitle(`${roleName} Rol Ataması Yapıldı`)
          .setColor(roleColor)
          .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
          .setDescription(`**${targetMember.displayName}** kullanıcısına **${roleName}** rolü verildi.`)
          .addField(
            "<:uye:1385550973040066651> Kullanıcı",
            `<@${targetMember.id}>`,
            true
          )
          .addField("🛡️ Verilen Rol", `<@&${role.id}>`, true)
          .addField("👮 İşlemi Yapan", `<@${interaction.user.id}>`, true)
          .setFooter({ text: `⚽ Apex Voucher • Rol Atama` })
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }
    }

    // Welcome channel message
    if (settings.welcomeChannel) {
      const welcomeChannel = interaction.guild.channels.cache.get(settings.welcomeChannel);
      if (welcomeChannel) {
        const topMessage = `> <@${targetId}> aramıza katıldı.`;

        const mainEmbed = new MessageEmbed()
          .setColor("#000000")
          .setAuthor({
            name: `${interaction.guild.name} • Kayıt Yapıldı!`
          })
          .setThumbnail(
            targetMember.user.displayAvatarURL({
              dynamic: true,
              size: 128,
            })
          )
          .setDescription(
            `<a:onay1:1385613791911219223> • ** <@${targetId}> aramıza** ${roleName} **mevkisiyle katıldı.*\n\n` +
              `<a:yetkili_geliyor:1385614217884864656> **• Kaydı gerçekleştiren yetkili**\n` +
              `> <@${interaction.user.id}>\n\n` +
              `<a:kopek:1385614129514942495> **• Aramıza hoş geldin**\n` +
              `> <@${targetId}>\n`
          )
          .setFooter({
            text: `Apex Voucher • ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`,
            iconURL: interaction.client.user.displayAvatarURL({
              dynamic: true,
              size: 64,
            }),
          });

        try {
          // Hoşgeldin mesajını gönder
          const welcomeMessage = await welcomeChannel.send({
            content: topMessage,
            embeds: [mainEmbed],
          });

          // Mesajı sürekli güncelle (nickname değişikliği için)
          const updateWelcomeMessage = async (attempt = 1) => {
            try {
              const updatedMember = await interaction.guild.members.fetch(targetId);
              const updatedEmbed = new MessageEmbed()
                .setColor("#000000")
                .setAuthor({
                  name: `${interaction.guild.name} • Kayıt Yapıldı!`
                })
                .setThumbnail(
                  updatedMember.user.displayAvatarURL({
                    dynamic: true,
                    size: 128,
                  })
                )
                .setDescription(
                  `<a:onay1:1385613791911219223> • ** <@${targetId}> aramıza** ${roleName} **mevkisiyle katıldı.*\n\n` +
                    `<a:yetkili_geliyor:1385614217884864656> **• Kaydı gerçekleştiren yetkili**\n` +
                    `> <@${interaction.user.id}>\n\n` +
                    `<a:kopek:1385614129514942495> **• Aramıza hoş geldin**\n` +
                    `> <@${targetId}>\n`
                )
                .setFooter({
                  text: `Apex Voucher • ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`,
                  iconURL: interaction.client.user.displayAvatarURL({
                    dynamic: true,
                    size: 64,
                  }),
                });

              await welcomeMessage.edit({
                content: topMessage,
                embeds: [updatedEmbed],
              });

              // 5 denemeye kadar tekrar güncelle
              if (attempt < 5) {
                setTimeout(() => updateWelcomeMessage(attempt + 1), 2000);
              }
            } catch (updateError) {
              console.error(`Hoşgeldin mesajı güncellenemedi (deneme ${attempt}):`, updateError);
            }
          };

          // İlk güncellemeyi 2 saniye sonra başlat  
          setTimeout(() => updateWelcomeMessage(), 2000);
        } catch (welcomeError) {
          console.error("Hoşgeldin mesajı gönderilemedi:", welcomeError);
        }
      }
    }
  } catch (logError) {
    console.error("Log mesajı gönderilemedi:", logError);
  }
}

// Function to show team selection buttons
async function showTeamSelection(interaction, targetMember, settings) {
  const teams = [
    { key: 'everton', name: 'Everton', emoji: '🔵' },
    { key: 'arsenal', name: 'Arsenal', emoji: '🔴' },
    { key: 'liverpool', name: 'Liverpool', emoji: '🔴' },
    { key: 'city', name: 'Manchester City', emoji: '🔵' },
    { key: 'realmadrid', name: 'Real Madrid', emoji: '⚪' },
    { key: 'psg', name: 'PSG', emoji: '🔴' },
    { key: 'barcelona', name: 'Barcelona', emoji: '🔴' },
    { key: 'leverkusen', name: 'Bayer Leverkusen', emoji: '🔴' }
  ];

  // Create buttons for teams (max 4 per row, 2 rows = 8 teams)
  const buttonRows = [];
  const buttonsPerRow = 4;
  
  for (let i = 0; i < teams.length; i += buttonsPerRow) {
    const rowTeams = teams.slice(i, i + buttonsPerRow);
    const row = new MessageActionRow();
    
    for (const team of rowTeams) {
      const button = new MessageButton()
        .setCustomId(`team_${team.key}_${targetMember.id}`)
        .setLabel(team.name)
        .setEmoji(team.emoji)
        .setStyle('SECONDARY');
      
      row.addComponents(button);
    }
    
    buttonRows.push(row);
  }

  const teamEmbed = new MessageEmbed()
    .setColor('#9b59b6')
    .setTitle('<:taraftar:1385549312607387738> Taraftar Takım Seçimi')
    .setDescription(`**${targetMember.displayName}** için desteklediği takımı seçin!`)
    .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: '🆔 Kullanıcı', value: `<@${targetMember.id}>`, inline: true },
      { name: '📝 Kayıt Eden', value: `<@${interaction.user.id}>`, inline: true },
      { name: '⏰ Kayıt Zamanı', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
    )
    .setFooter({ text: 'Apex Voucher • Taraftar Takım Seçimi' })
    .setTimestamp();

  await interaction.editReply({
    embeds: [teamEmbed],
    components: buttonRows
  });
}

// Function to handle team selection
async function handleTeamSelection(interaction, client) {
  const parts = interaction.customId.split("_");
  const teamKey = parts[1];
  const targetId = parts[2];
  
  const guildId = interaction.guild.id;
  const settings = await db.getGuildSettings(guildId);
  
  if (!settings) {
    return interaction.reply({
      content: "❓ Kayıt sistemi kurulmamış!",
      ephemeral: true,
    });
  }

  const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
  if (!targetMember) {
    return interaction.reply({
      content: "❌ Kullanıcı bulunamadı!",
      ephemeral: true,
    });
  }

  // Check permissions
  if (
    settings.yetkiliRole &&
    !interaction.member.roles.cache.has(settings.yetkiliRole) &&
    !interaction.member.permissions.has(8n)
  ) {
    return interaction.reply({
      content: "🚫 Bu butonu kullanmak için yetkili olmalısınız!",
      ephemeral: true,
    });
  }

  await interaction.deferUpdate();

  // Team data mapping
  const teamData = {
    'everton': { name: 'Everton', emoji: '🔵' },
    'arsenal': { name: 'Arsenal', emoji: '🔴' },
    'liverpool': { name: 'Liverpool', emoji: '🔴' },
    'city': { name: 'Manchester City', emoji: '🔵' },
    'realmadrid': { name: 'Real Madrid', emoji: '⚪' },
    'psg': { name: 'PSG', emoji: '🔴' },
    'barcelona': { name: 'Barcelona', emoji: '🔴' },
    'leverkusen': { name: 'Bayer Leverkusen', emoji: '🔴' }
  };

  const team = teamData[teamKey];
  if (!team) {
    return interaction.editReply({
      content: "❌ Geçersiz takım seçimi!",
      components: []
    });
  }

  // Get the main taraftar role
  const taraftarRole = settings.taraftarRole ? interaction.guild.roles.cache.get(settings.taraftarRole) : null;
  if (!taraftarRole) {
    return interaction.editReply({
      content: "❌ Taraftar rolü ayarlanmamış!",
      components: []
    });
  }

  try {
    const rolePromises = [];
    
    // Add main taraftar role
    rolePromises.push(
      targetMember.roles.add(taraftarRole).catch((error) => {
        console.error(`Taraftar rolü verme hatası: ${error}`);
        throw error;
      })
    );

    // Add üye role if configured
    if (settings.uyeRole && settings.autoAssignUyeRole) {
      const uyeRole = interaction.guild.roles.cache.get(settings.uyeRole);
      if (uyeRole && !targetMember.roles.cache.has(uyeRole.id)) {
        rolePromises.push(
          targetMember.roles.add(uyeRole).catch((uyeRoleError) => {
            console.error(`Üye rolü verme hatası: ${uyeRoleError}`);
          })
        );
      }
    }

    await Promise.allSettled(rolePromises);

    // Update database
    db.updateRegistrationRole(guildId, targetId, taraftarRole.id, `${team.emoji} ${team.name} Taraftarı`);

    // Create success embed
    const successEmbed = new MessageEmbed()
      .setColor('#9b59b6')
      .setTitle(`${team.emoji} Taraftar Takım Ataması Başarılı!`)
      .setDescription(
        `**${targetMember.displayName}** kullanıcısı **${team.emoji} ${team.name}** taraftarı olarak kayıt edildi!`
      )
      .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
      .addField(
        "<:uye:1385550973040066651> Kullanıcı",
        `<@${targetMember.id}>`,
        true
      )
      .addField("⚽ Desteklediği Takım", `${team.emoji} ${team.name}`, true)
      .addField("👮 İşlemi Yapan", `<@${interaction.user.id}>`, true)
      .setFooter({ text: "Apex Voucher • Taraftar Takım Ataması" })
      .setTimestamp();

    await interaction.editReply({
      embeds: [successEmbed],
      components: []
    });

    // Send logs and welcome messages
    await sendRoleAssignmentLogs(interaction, targetMember, `<:taraftar:1385549312607387738> ${team.emoji} ${team.name} Taraftarı`, taraftarRole, settings, '#9b59b6');

  } catch (error) {
    console.error("Team role assignment error:", error);
    return interaction.editReply({
      content: "❌ Takım rolü verme işlemi sırasında bir hata oluştu!",
      components: []
    });
  }
}