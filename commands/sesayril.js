
const { getVoiceConnection } = require('@discordjs/voice');
const sescekCommand = require('./sescek');

module.exports = {
  name: 'sesayril',
  aliases: ['sesayrıl'],
  description: 'Botu ses kanalından çıkarır ve kalıcı bağlantıyı durdurur',
  async execute(message, args, client) {
    try {
      // Sunucu ID'sini al
      const guildId = message.guild.id;
      
      // Botun ses bağlantısını kontrol et
      const connection = getVoiceConnection(guildId);
      
      if (!connection) {
        return message.reply('❓ Zaten herhangi bir ses kanalında değilim!');
      }
      
      // Kalıcı bağlantı kaydını temizle
      sescekCommand.clearPersistentConnection(guildId);
      
      // Ses bağlantısını sonlandır
      connection.destroy();
      
      // Bağlantıyı client'tan kaldır
      if (client.voiceConnections) {
        client.voiceConnections.delete(guildId);
      }
      
      // Başarı mesajı
      return message.reply('✅ Ses kanalından ayrıldım ve kalıcı bağlantı durduruldu!');
    } catch (error) {
      console.error('Ses kanalından ayrılma hatası:', error);
      return message.reply('❌ Ses kanalından ayrılırken bir hata oluştu.');
    }
  }
};
