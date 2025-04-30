const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');
const db = require('../utils/database');

module.exports = {
  name: 'kayıtkur',
  description: 'Set up registration system',
  async execute(message, args, client) {
    // Check if user has admin permission
    if (!message.member.permissions.has('ADMINISTRATOR')) {
      return message.reply('Bu komutu kullanmak için yönetici yetkisine sahip olmalısınız!');
    }

    const guildId = message.guild.id;
    
    // Check if setup is already done
    const existingSettings = await db.getGuildSettings(guildId);
    if (existingSettings) {
      const confirmRow = new MessageActionRow()
        .addComponents(
          new MessageButton()
            .setCustomId('confirm_reset')
            .setLabel('Evet, Sıfırla')
            .setStyle('DANGER'),
          new MessageButton()
            .setCustomId('cancel_reset')
            .setLabel('İptal')
            .setStyle('SECONDARY')
        );
      
      const confirmMsg = await message.reply({
        content: 'Kayıt sistemi zaten kurulmuş! Sıfırlamak istiyor musunuz?',
        components: [confirmRow]
      });
      
      // Wait for button interaction
      try {
        const filter = i => i.customId.startsWith('confirm_') && i.user.id === message.author.id;
        const interaction = await confirmMsg.awaitMessageComponent({ filter, time: 30000 });
        
        if (interaction.customId === 'cancel_reset') {
          return await interaction.update({ content: 'İşlem iptal edildi.', components: [] });
        }
        
        // Continue if confirmed reset
        await interaction.update({ content: 'Kayıt sistemi sıfırlanıyor...', components: [] });
      } catch (e) {
        return await confirmMsg.edit({ content: 'İşlem zaman aşımına uğradı.', components: [] });
      }
    }
    
    // Ask for "Kayıtsız" role
    const kayitsizMsg = await message.channel.send('Lütfen "Kayıtsız" rolünü etiketleyin veya "oluştur" yazın:');
    let kayitsizRole;
    
    try {
      const collected = await message.channel.awaitMessages({
        filter: m => m.author.id === message.author.id,
        max: 1,
        time: 30000,
        errors: ['time']
      });
      
      const response = collected.first();
      
      if (response.content.toLowerCase() === 'oluştur') {
        // Create role if it doesn't exist
        kayitsizRole = await message.guild.roles.create({
          name: 'Kayıtsız',
          color: 'GREY',
          reason: 'Kayıt sistemi kurulumu'
        });
      } else {
        const mentionedRole = response.mentions.roles.first();
        if (!mentionedRole) {
          return message.channel.send('Geçerli bir rol etiketlemediniz. Kurulum iptal edildi.');
        }
        kayitsizRole = mentionedRole;
      }
    } catch (error) {
      return message.channel.send('Zaman aşımı! Kurulum iptal edildi.');
    }
    
    // Set up roles
    const futbolcuMsg = await message.channel.send('Lütfen "Futbolcu" rolünü etiketleyin veya "oluştur" yazın:');
    let futbolcuRole;
    
    try {
      const collected = await message.channel.awaitMessages({
        filter: m => m.author.id === message.author.id,
        max: 1,
        time: 30000,
        errors: ['time']
      });
      
      const response = collected.first();
      
      if (response.content.toLowerCase() === 'oluştur') {
        futbolcuRole = await message.guild.roles.create({
          name: 'Futbolcu',
          color: 'BLUE',
          reason: 'Kayıt sistemi kurulumu'
        });
      } else {
        const mentionedRole = response.mentions.roles.first();
        if (!mentionedRole) {
          return message.channel.send('Geçerli bir rol etiketlemediniz. Kurulum iptal edildi.');
        }
        futbolcuRole = mentionedRole;
      }
    } catch (error) {
      return message.channel.send('Zaman aşımı! Kurulum iptal edildi.');
    }
    
    // Similar process for other roles
    const tdMsg = await message.channel.send('Lütfen "Teknik Direktör" rolünü etiketleyin veya "oluştur" yazın:');
    let tdRole;
    
    try {
      const collected = await message.channel.awaitMessages({
        filter: m => m.author.id === message.author.id,
        max: 1,
        time: 30000,
        errors: ['time']
      });
      
      const response = collected.first();
      
      if (response.content.toLowerCase() === 'oluştur') {
        tdRole = await message.guild.roles.create({
          name: 'Teknik Direktör',
          color: 'GREEN',
          reason: 'Kayıt sistemi kurulumu'
        });
      } else {
        const mentionedRole = response.mentions.roles.first();
        if (!mentionedRole) {
          return message.channel.send('Geçerli bir rol etiketlemediniz. Kurulum iptal edildi.');
        }
        tdRole = mentionedRole;
      }
    } catch (error) {
      return message.channel.send('Zaman aşımı! Kurulum iptal edildi.');
    }
    
    // Başkan role
    const baskanMsg = await message.channel.send('Lütfen "Başkan" rolünü etiketleyin veya "oluştur" yazın:');
    let baskanRole;
    
    try {
      const collected = await message.channel.awaitMessages({
        filter: m => m.author.id === message.author.id,
        max: 1,
        time: 30000,
        errors: ['time']
      });
      
      const response = collected.first();
      
      if (response.content.toLowerCase() === 'oluştur') {
        baskanRole = await message.guild.roles.create({
          name: 'Başkan',
          color: 'RED',
          reason: 'Kayıt sistemi kurulumu'
        });
      } else {
        const mentionedRole = response.mentions.roles.first();
        if (!mentionedRole) {
          return message.channel.send('Geçerli bir rol etiketlemediniz. Kurulum iptal edildi.');
        }
        baskanRole = mentionedRole;
      }
    } catch (error) {
      return message.channel.send('Zaman aşımı! Kurulum iptal edildi.');
    }
    
    // Partner role
    const partnerMsg = await message.channel.send('Lütfen "Partner" rolünü etiketleyin veya "oluştur" yazın:');
    let partnerRole;
    
    try {
      const collected = await message.channel.awaitMessages({
        filter: m => m.author.id === message.author.id,
        max: 1,
        time: 30000,
        errors: ['time']
      });
      
      const response = collected.first();
      
      if (response.content.toLowerCase() === 'oluştur') {
        partnerRole = await message.guild.roles.create({
          name: 'Partner',
          color: 'PURPLE',
          reason: 'Kayıt sistemi kurulumu'
        });
      } else {
        const mentionedRole = response.mentions.roles.first();
        if (!mentionedRole) {
          return message.channel.send('Geçerli bir rol etiketlemediniz. Kurulum iptal edildi.');
        }
        partnerRole = mentionedRole;
      }
    } catch (error) {
      return message.channel.send('Zaman aşımı! Kurulum iptal edildi.');
    }
    
    // Ask for welcome channel
    const welcomeMsg = await message.channel.send('Lütfen hoş geldin mesajlarının gönderileceği kanalı etiketleyin:');
    let welcomeChannel;
    
    try {
      const collected = await message.channel.awaitMessages({
        filter: m => m.author.id === message.author.id,
        max: 1,
        time: 30000,
        errors: ['time']
      });
      
      const response = collected.first();
      welcomeChannel = response.mentions.channels.first();
      
      if (!welcomeChannel) {
        return message.channel.send('Geçerli bir kanal etiketlemediniz. Kurulum iptal edildi.');
      }
    } catch (error) {
      return message.channel.send('Zaman aşımı! Kurulum iptal edildi.');
    }
    
    // Ask for auto-nickname setting
    const autoNickMsg = await message.channel.send('Yeni üyelerin isimlerini otomatik olarak "Kayıtsız" yapmak istiyor musunuz? (evet/hayır)');
    let autoNickname;
    
    try {
      const collected = await message.channel.awaitMessages({
        filter: m => m.author.id === message.author.id && ['evet', 'hayır'].includes(m.content.toLowerCase()),
        max: 1,
        time: 30000,
        errors: ['time']
      });
      
      const response = collected.first();
      autoNickname = response.content.toLowerCase() === 'evet';
    } catch (error) {
      return message.channel.send('Zaman aşımı! Kurulum iptal edildi.');
    }
    
    // Save settings
    await db.saveGuildSettings(guildId, {
      kayitsizRole: kayitsizRole.id,
      futbolcuRole: futbolcuRole.id,
      teknikDirektorRole: tdRole.id,
      baskanRole: baskanRole.id,
      partnerRole: partnerRole.id,
      welcomeChannel: welcomeChannel.id,
      autoNickname: autoNickname
    });
    
    // Send success message
    const embed = new MessageEmbed()
      .setTitle('Kayıt Sistemi Kurulumu Tamamlandı')
      .setColor('GREEN')
      .addField('Kayıtsız Rolü', `<@&${kayitsizRole.id}>`, true)
      .addField('Futbolcu Rolü', `<@&${futbolcuRole.id}>`, true)
      .addField('Teknik Direktör Rolü', `<@&${tdRole.id}>`, true)
      .addField('Başkan Rolü', `<@&${baskanRole.id}>`, true)
      .addField('Partner Rolü', `<@&${partnerRole.id}>`, true)
      .addField('Hoş Geldin Kanalı', `<#${welcomeChannel.id}>`, true)
      .addField('Otomatik İsim Değiştirme', autoNickname ? 'Aktif' : 'Pasif', true)
      .setFooter({ text: 'Futbol Kayıt Sistemi' })
      .setTimestamp();
      
    message.channel.send({ embeds: [embed] });
  }
};
