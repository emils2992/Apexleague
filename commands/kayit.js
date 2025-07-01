const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');
const db = require('../utils/database');

module.exports = {
  name: 'kayit',
  aliases: ['kayıt'],
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
      
      // Paralel işlemler için promise array
      const promises = [];
      
      // Set nickname (without emoji)
      promises.push(
        target.setNickname(name).catch(nicknameError => {
          console.error(`İsim değiştirme hatası: ${nicknameError}`);
        })
      );
      
      // Remove "Kayıtsız" role if exists
      if (settings.kayitsizRole && target.roles.cache.has(settings.kayitsizRole)) {
        promises.push(
          target.roles.remove(settings.kayitsizRole).catch(roleError => {
            console.error(`Kayıtsız rolü kaldırma hatası: ${roleError}`);
          })
        );
      }
      
      // Automatically add the member role if configured
      if (settings.uyeRole && settings.autoAssignUyeRole) {
        const uyeRole = message.guild.roles.cache.get(settings.uyeRole);
        if (uyeRole) {
          promises.push(
            target.roles.add(uyeRole).catch(roleError => {
              console.error(`Üye rolü ekleme hatası: ${roleError}`);
            })
          );
        }
      }
      
      // Tüm işlemleri paralel çalıştır
      await Promise.allSettled(promises);
      
      // Tüm mevcut rolleri listele ve ardından en fazla 5 buton olacak şekilde dağıt
      const allRoleButtons = [];
      
      // Tüm mevcut rol seçeneklerini bir diziye ekle, her biri farklı renkte

      
      if (settings.futbolcuRole) {
        allRoleButtons.push({
          id: `role_futbolcu_${target.id}`,
          label: 'Futbolcu',
          style: 'PRIMARY', // Mavi
          roleId: settings.futbolcuRole,
          emoji: '<:futbolcu:1385547729215819906>',
          showPositions: true // Bu buton pozisyon seçimi açacak
        });
      }
      
      if (settings.teknikDirektorRole) {
        allRoleButtons.push({
          id: `role_tekdir_${target.id}`,
          label: 'Teknik Direktör',
          style: 'SUCCESS', // Yeşil
          roleId: settings.teknikDirektorRole,
          emoji: '<:teknikdirektor:1385548384017846272>'
        });
      }
      
      if (settings.baskanRole) {
        allRoleButtons.push({
          id: `role_baskan_${target.id}`,
          label: 'Başkan',
          style: 'DANGER', // Kırmızı
          roleId: settings.baskanRole,
          emoji: '<:baskan:1385548870523551816>'
        });
      }
      
      // Taraftar butonu - takım rolleri varsa göster
      if (settings.teamRoles && Object.keys(settings.teamRoles).length > 0) {
        allRoleButtons.push({
          id: `role_taraftar_${target.id}`,
          label: 'Taraftar',
          style: 'SECONDARY', // Gri
          roleId: null, // Takım seçimi açacak
          emoji: '<:taraftar:1385549312607387738>',
          showTeams: true // Bu buton takım seçimi açacak
        });
      }
      
      // Bayan Üye için özel stil
      if (settings.bayanUyeRole) {
        allRoleButtons.push({
          id: `role_bayan_${target.id}`,
          label: 'Bayan Üye',
          style: 'DANGER', // Kırmızı
          roleId: settings.bayanUyeRole,
          emoji: '<:bayanuye:1385548584228884594>'
        });
      }
      
      if (settings.partnerRole) {
        allRoleButtons.push({
          id: `role_partner_${target.id}`,
          label: 'Partner',
          style: 'SUCCESS', // Yeşil
          roleId: settings.partnerRole,
          emoji: '<:partner:1385547942202445966>'
        });
      }
      
      // Butonları sayfalar halinde düzenle
      const row1Components = [];
      const row2Components = [];
      
      // Butonları daha belirgin renklerle sırala ve yan yana benzer renklerin gelmemesini sağla
      // Kırmızı, yeşil, mavi, gri şeklinde sırala
      allRoleButtons.sort((a, b) => {
        // Renklere öncelik değeri veriyoruz
        const styleValues = {
          'DANGER': 1,   // Kırmızı butonlar en başta
          'SUCCESS': 2,  // Yeşil butonlar ikinci
          'PRIMARY': 3,  // Mavi butonlar üçüncü
          'SECONDARY': 4 // Gri butonlar en sonda
        };
        
        return styleValues[a.style] - styleValues[b.style];
      });
      
      // İlk satıra en fazla 3 buton ekle
      for (let i = 0; i < Math.min(allRoleButtons.length, 3); i++) {
        const button = allRoleButtons[i];
        const buttonBuilder = new MessageButton()
          .setCustomId(button.id)
          .setLabel(button.label)
          .setStyle(button.style);
        
        if (button.emoji) {
          buttonBuilder.setEmoji(button.emoji);
        }
        
        row1Components.push(buttonBuilder);
      }
      
      // İkinci satıra kalan butonları ekle (en fazla 3 buton - 6 rol için)
      for (let i = 3; i < Math.min(allRoleButtons.length, 6); i++) {
        const button = allRoleButtons[i];
        const buttonBuilder = new MessageButton()
          .setCustomId(button.id)
          .setLabel(button.label)
          .setStyle(button.style);
        
        if (button.emoji) {
          buttonBuilder.setEmoji(button.emoji);
        }
        
        row2Components.push(buttonBuilder);
      }
      
      // ActionRow oluştur
      const row1 = new MessageActionRow().addComponents(...row1Components);
      
      // İkinci satır için yeterli buton varsa, ikinci satırı da oluştur
      let row2 = null;
      if (row2Components.length > 0) {
        row2 = new MessageActionRow().addComponents(...row2Components);
      }

      // Create embed for registration
      const registerEmbed = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle('👤 Kullanıcı Kaydı')
        .setDescription(`**${name}** kullanıcısı için bir rol seçin!`)
        .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '🆔 Kullanıcı', value: `<@${target.id}>`, inline: true },
          { name: '📝 Kayıt Eden', value: `<@${message.author.id}>`, inline: true },
          { name: '⏰ Kayıt Zamanı', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setFooter({ text: 'Futbol Kayıt Sistemi' })
        .setTimestamp();

      // Butonları kontrol et ve message reply'ı düzenle
      const components = [];
      if (row1 && row1.components.length > 0) {
        components.push(row1);
      }
      if (row2 && row2.components.length > 0) {
        components.push(row2);
      }
      
      // Hiç buton yoksa, kullanıcıya bilgi ver
      if (components.length === 0) {
        await message.reply({
          content: "❌ Kayıt için hiç rol bulunamadı! Lütfen `.kayitkur` komutunu kullanarak en az bir rol ayarlayın.",
          embeds: [registerEmbed]
        });
        return;
      }
      
      // Butonları ve embed'i gönder
      await message.reply({ 
        embeds: [registerEmbed],
        components: components
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
      
      // Hoş geldin mesajları artık burada gönderilmeyecek, bunun yerine rol seçildikten sonra interactionCreate event'inde gönderilecek
      
      // Sadece log kanalına ilk kayıt bilgisi gönderilecek
      if (settings.logChannel) {
        const logChannel = message.guild.channels.cache.get(settings.logChannel);
        if (logChannel) {
          const logEmbed = new MessageEmbed()
            .setTitle('📝 Kullanıcı Kaydı Başlatıldı')
            .setColor('#3498db') 
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
            .addField('👤 Kullanıcı', `<@${target.id}> (\`${target.user.tag}\`)`, false)
            .addField('✏️ Yeni İsim', `\`${name}\``, false)
            .addField('👮 Kaydeden Yetkili', `<@${message.author.id}>`, true)
            .addField('⏰ Kayıt Zamanı', new Date().toLocaleString('tr-TR'), true)
            .addField('ℹ️ Durum', 'Rol seçimi bekleniyor...', false)
            .setFooter({ text: `ID: ${target.id} • Kayıt Başlatıldı` })
            .setTimestamp();
          
          await logChannel.send({ embeds: [logEmbed] });
        }
      }
      
    } catch (error) {
      console.error('Kayıt İşlemi Hatası:', error);
      console.error('Hata Detayları:', error.message);
      console.error('Hata Yeri:', error.stack);
      message.reply(`❌ Kayıt işlemi sırasında bir hata oluştu: ${error.message}`);
    }
  }
};
