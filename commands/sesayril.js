const { getVoiceConnection } = require('@discordjs/voice');

module.exports = {
  name: 'sesayril',
  description: 'Botu ses kanalından çıkarır',
  async execute(message, args, client) {
    try {
      // Sunucu ID'sini al
      const guildId = message.guild.id;
      
      // Botun ses bağlantısını kontrol et
      const connection = getVoiceConnection(guildId);
      
      if (!connection) {
        return message.reply('❓ Zaten herhangi bir ses kanalında değilim!');
      }
      
      // Ses bağlantısını sonlandır
      connection.destroy();
      
      // Bağlantıyı client'tan kaldır
      if (client.voiceConnections) {
        client.voiceConnections.delete(guildId);
      }
      
      // Başarı mesajı
      return message.reply('✅ Ses kanalından ayrıldım!');
    } catch (error) {
      console.error('Ses kanalından ayrılma hatası:', error);
      return message.reply('❌ Ses kanalından ayrılırken bir hata oluştu.');
    }
  }
};
