const db = require("../utils/database");
const { MessageEmbed } = require("discord.js");

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
            roleId = settings.futbolcuRole;
            roleName = "Futbolcu";
            roleEmoji = "<:futbolcu:1385547729215819906>";
            roleColor = "#3498db"; // Blue
            break;
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
            roleId = settings.taraftarRole;
            roleName = "Taraftar";
            roleEmoji = "<:taraftar:1385549312607387738>";
            roleColor = "#9b59b6"; // Purple
            break;
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

        // Hızlı işlem için paralel operasyonlar
        const roleOperations = [];
        
        // Ana rolü ekle
        roleOperations.push(
          targetMember.roles.add(role).catch(error => {
            console.log(`Rol verme hatası: ${error.message}`);
            throw error;
          })
        );

        // Üye rolü varsa ekle
        const guildSettings = await db.getGuildSettings(guildId);
        if (guildSettings?.uyeRole && guildSettings.autoAssignUyeRole) {
          const uyeRole = interaction.guild.roles.cache.get(guildSettings.uyeRole);
          if (uyeRole && !targetMember.roles.cache.has(uyeRole.id)) {
            roleOperations.push(
              targetMember.roles.add(uyeRole).catch(error => {
                console.log(`Üye rolü verme hatası: ${error.message}`);
              })
            );
          }
        }

        // Veritabanı güncelleme
        roleOperations.push(
          db.updateRegistrationRole(guildId, targetId, role.id, roleName)
        );

        // Tüm işlemleri paralel çalıştır
        try {
          await Promise.all(roleOperations);
        } catch (error) {
          return interaction.editReply({
            content: `❌ Rol verme hatası: ${error.message}`,
            components: [],
          });
        }

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



        // Hoş geldin mesajlarını paralel olarak gönder - daha hızlı!
        const messageOperations = [];

        // Log kanalına mesaj gönder (paralel)
        if (guildSettings?.logChannel) {
          const logChannel = interaction.guild.channels.cache.get(guildSettings.logChannel);
          if (logChannel) {
            const logEmbed = new MessageEmbed()
              .setTitle(`${roleEmoji} Rol Ataması Yapıldı`)
              .setColor(roleColor)
              .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
              .setDescription(`**${targetMember.displayName}** kullanıcısına **${roleEmoji} ${roleName}** rolü verildi.`)
              .addField("<:uye:1385550973040066651> Kullanıcı", `<@${targetMember.id}>`, true)
              .addField("🛡️ Verilen Rol", `${roleEmoji} <@&${role.id}>`, true)
              .addField("👮 İşlemi Yapan", `<@${interaction.user.id}>`, true)
              .setFooter({ text: `⚽ Apex Voucher • Rol Atama` })
              .setTimestamp();

            messageOperations.push(
              logChannel.send({ embeds: [logEmbed] }).catch(err => 
                console.log(`Log mesajı hatası: ${err.message}`)
              )
            );
          }
        }

        // Hoş geldin kanalına mesaj gönder (paralel)
        if (guildSettings?.welcomeChannel) {
          const welcomeChannel = interaction.guild.channels.cache.get(guildSettings.welcomeChannel);
          if (welcomeChannel) {
            const topMessage = `> <@${targetMember.id}> (**${targetMember.displayName}**) **aramıza katıldı.**`;

            const mainEmbed = new MessageEmbed()
              .setColor("#000000")
              .setAuthor({
                name: `${interaction.guild.name} • Kayıt Yapıldı!`,
                iconURL: interaction.guild.iconURL({ dynamic: true, size: 64 }),
              })
              .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true, size: 128 }))
              .setDescription(
                `<a:onay1:1385613791911219223> • ** <@${targetMember.id}> aramıza** ${roleEmoji} **${roleName}** *rolüyle katıldı.*\n\n` +
                `<a:yetkili_geliyor:1385614217884864656> **• Kaydı gerçekleştiren yetkili**\n> <@${interaction.user.id}>\n\n` +
                `<a:kopek:1385614129514942495> **• Aramıza hoş geldin**\n> <@${targetMember.id}>\n`
              )
              .setImage(
                interaction.guild.icon ? 
                  `https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.icon}.${interaction.guild.icon.startsWith('a_') ? 'gif' : 'png'}?size=256` :
                  null
              )
              .setFooter({
                text: "Apex Voucher Kayıt Sistemi",
                iconURL: interaction.client.user.displayAvatarURL({ dynamic: true, size: 64 }),
              });

            messageOperations.push(
              welcomeChannel.send({ content: topMessage, embeds: [mainEmbed] }).catch(err => 
                console.log(`Hoş geldin mesajı hatası: ${err.message}`)
              )
            );
          }
        }

        // DM gönder (paralel)
        const dmEmbed = new MessageEmbed()
          .setColor(roleColor)
          .setTitle("<a:hosgeldin:1385547269360713779> Rol Verildi!")
          .setDescription(`**${interaction.guild.name}** sunucusunda size **${roleEmoji} ${roleName}** rolü verildi!`)
          .addField("💡 Bilgi", "Artık sunucuda daha fazla erişiminiz var!")
          .setFooter({ text: "İyi eğlenceler!" });

        messageOperations.push(
          targetMember.send({ embeds: [dmEmbed] }).catch(err => 
            console.log(`DM hatası: ${err.message}`)
          )
        );

        // Tüm mesajları paralel gönder - çok daha hızlı!
        Promise.all(messageOperations).catch(() => {
          // Mesaj hatalarını yok say, ana işlem devam etsin
        });
      } catch (error) {
        console.error("Role assignment error:", error);
        return interaction.reply({
          content: "❌ Rol verme işlemi sırasında bir hata oluştu!",
          ephemeral: true,
        });
      }
    }
  },
};