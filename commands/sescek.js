const { joinVoiceChannel, createAudioPlayer, NoSubscriberBehavior, AudioPlayerStatus } = require('@discordjs/voice');

module.exports = {
  name: 'sescek',
  description: 'Botu ses kanalına çeker',
  async execute(message, args, client) {
    try {
      // Kullanıcının ses kanalında olup olmadığını kontrol et
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.reply('❌ Önce bir ses kanalına katılmalısınız!');
      }
      
      // Ses kanalını al
      const guildId = message.guild.id;
      
      // Botun zaten bir ses kanalında olup olmadığını kontrol et
      const existingConnection = client.voice?.adapters?.get(guildId);
      if (existingConnection) {
        // Bot zaten bir ses kanalında, bağlantıyı yeni kanala taşı
        try {
          const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: guildId,
            adapterCreator: message.guild.voiceAdapterCreator,
            selfDeaf: false, // Kendini sağır yapmaz
            selfMute: false  // Kendini susturmaz
          });
          
          client.voiceConnections = client.voiceConnections || new Map();
          client.voiceConnections.set(guildId, connection);
          
          // Başarı mesajı
          return message.reply(`✅ ${voiceChannel.name} kanalına taşındım!`);
        } catch (error) {
          console.error('Ses kanalı değiştirme hatası:', error);
          return message.reply('❌ Ses kanalını değiştirirken bir hata oluştu.');
        }
      }
      
      // Yeni ses bağlantısı oluştur
      try {
        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: guildId,
          adapterCreator: message.guild.voiceAdapterCreator,
          selfDeaf: false, // Kendini sağır yapmaz
          selfMute: false  // Kendini susturmaz
        });
        
        // Bağlantıyı client'a kaydet
        client.voiceConnections = client.voiceConnections || new Map();
        client.voiceConnections.set(guildId, connection);
        
        // Bot bağlantısı kesildiğinde
        connection.on('stateChange', (oldState, newState) => {
          if (newState.status === 'disconnected') {
            client.voiceConnections.delete(guildId);
            console.log(`[SES] ${guildId} sunucusunda ses bağlantısı kesildi.`);
          }
        });
        
        // Başarı mesajı
        return message.reply(`✅ **${voiceChannel.name}** kanalına başarıyla katıldım!`);
      } catch (error) {
        console.error('Ses kanalına katılma hatası:', error);
        return message.reply('❌ Ses kanalına katılırken bir hata oluştu.');
      }
    } catch (error) {
      console.error('Ses komutu hatası:', error);
      return message.reply('❌ Bir hata oluştu.');
    }
  }
};
