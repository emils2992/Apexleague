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
      
      // Sadece mevcut rolleri butonlara ekle
      const row1Components = [];
      const row2Components = [];
      
      // İlk satır butonları (maksimum 3 tane)
      if (settings.futbolcuRole) {
        row1Components.push(
          new MessageButton()
            .setCustomId(`role_futbolcu_${target.id}`)
            .setLabel('⚽ Futbolcu')
            .setStyle('PRIMARY')
        );
      }
      
      if (settings.teknikDirektorRole) {
        row1Components.push(
          new MessageButton()
            .setCustomId(`role_teknikdirektor_${target.id}`)
            .setLabel('📋 Teknik Direktör')
            .setStyle('SUCCESS')
        );
      }
      
      if (settings.baskanRole) {
        row1Components.push(
          new MessageButton()
            .setCustomId(`role_baskan_${target.id}`)
            .setLabel('👑 Başkan')
            .setStyle('DANGER')
        );
      }
      
      // Eğer ilk satırda hala yer varsa, ikinci satırdaki butonları buraya taşı
      if (row1Components.length < 3) {
        if (settings.taraftarRole && row1Components.length < 3) {
          row1Components.push(
            new MessageButton()
              .setCustomId(`role_taraftar_${target.id}`)
              .setLabel('🏟️ Taraftar')
              .setStyle('PRIMARY')
          );
        }
        
        if (settings.bayanUyeRole && row1Components.length < 3) {
          row1Components.push(
            new MessageButton()
              .setCustomId(`role_bayan_${target.id}`)
              .setLabel('👩 Bayan Üye')
              .setStyle('DANGER')
          );
        }
        
        if (settings.partnerRole && row1Components.length < 3) {
          row1Components.push(
            new MessageButton()
              .setCustomId(`role_partner_${target.id}`)
              .setLabel('🤝 Partner')
              .setStyle('SECONDARY')
          );
        }
      }
      
      // İkinci satıra kalan butonları ekle
      if (row1Components.length >= 3) {
        if (settings.taraftarRole) {
          row2Components.push(
            new MessageButton()
              .setCustomId(`role_taraftar_${target.id}`)
              .setLabel('🏟️ Taraftar')
              .setStyle('PRIMARY')
          );
        }
        
        if (settings.bayanUyeRole) {
          row2Components.push(
            new MessageButton()
              .setCustomId(`role_bayan_${target.id}`)
              .setLabel('👩 Bayan Üye')
              .setStyle('DANGER')
          );
        }
        
        if (settings.partnerRole) {
          row2Components.push(
            new MessageButton()
              .setCustomId(`role_partner_${target.id}`)
              .setLabel('🤝 Partner')
              .setStyle('SECONDARY')
          );
        }
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
        .addField('🆔 Kullanıcı', `<@${target.id}>`, true)
        .addField('📝 Kayıt Eden', `<@${message.author.id}>`, true)
        .addField('⏰ Kayıt Zamanı', new Date().toLocaleString('tr-TR'), true)
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
      console.error(error);
      message.reply('❌ Kayıt işlemi sırasında bir hata oluştu!');
    }
  }
};
