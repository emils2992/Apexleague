
const {
  joinVoiceChannel,
  createAudioPlayer,
  NoSubscriberBehavior,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
} = require("@discordjs/voice");

// Kalıcı ses bağlantıları için global map
const persistentConnections = new Map();

module.exports = {
  name: "sescek",
  aliases: ["sesçek"],
  description: "Botu ses kanalına çeker ve kalıcı olarak tutar",
  async execute(message, args, client) {
    try {
      // Kullanıcının ses kanalında olup olmadığını kontrol et
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.reply("❌ Önce bir ses kanalına katılmalısınız!");
      }

      const guildId = message.guild.id;
      const channelId = voiceChannel.id;

      // Kalıcı bağlantı kurma fonksiyonu
      const createPersistentConnection = () => {
        try {
          const connection = joinVoiceChannel({
            channelId: channelId,
            guildId: guildId,
            adapterCreator: message.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false,
          });

          // Bağlantıyı client'a kaydet
          client.voiceConnections = client.voiceConnections || new Map();
          client.voiceConnections.set(guildId, connection);

          // Kalıcı bağlantı bilgisini kaydet
          persistentConnections.set(guildId, {
            channelId: channelId,
            guildId: guildId,
            guild: message.guild,
            lastConnected: Date.now()
          });

          // Bağlantı durumu değişikliklerini dinle
          connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
            console.log(`[SES] ${guildId} sunucusunda bağlantı kesildi, yeniden bağlanmaya çalışılıyor...`);
            
            // Kalıcı bağlantı kayıtlı mı kontrol et
            const persistentInfo = persistentConnections.get(guildId);
            if (persistentInfo) {
              // 3 saniye bekle ve yeniden bağlan
              setTimeout(() => {
                try {
                  // Kanal hala mevcut mu kontrol et
                  const channel = message.guild.channels.cache.get(persistentInfo.channelId);
                  if (channel && channel.isVoice()) {
                    console.log(`[SES] ${guildId} sunucusunda yeniden bağlanılıyor...`);
                    createPersistentConnection();
                  } else {
                    console.log(`[SES] ${guildId} sunucusunda hedef kanal bulunamadı, kalıcı bağlantı kaldırılıyor.`);
                    persistentConnections.delete(guildId);
                  }
                } catch (reconnectError) {
                  console.error(`[SES] ${guildId} sunucusunda yeniden bağlanma hatası:`, reconnectError);
                  // 10 saniye sonra tekrar dene
                  setTimeout(() => {
                    if (persistentConnections.has(guildId)) {
                      createPersistentConnection();
                    }
                  }, 10000);
                }
              }, 3000);
            }
          });

          // Bağlantı hazır olduğunda
          connection.on(VoiceConnectionStatus.Ready, () => {
            console.log(`[SES] ${guildId} sunucusunda ses bağlantısı hazır ve kalıcı olarak ayarlandı.`);
          });

          // Bağlantı yok edildiğinde
          connection.on(VoiceConnectionStatus.Destroyed, () => {
            console.log(`[SES] ${guildId} sunucusunda bağlantı tamamen yok edildi.`);
            client.voiceConnections?.delete(guildId);
          });

          return connection;
        } catch (error) {
          console.error(`[SES] ${guildId} sunucusunda bağlantı oluşturma hatası:`, error);
          throw error;
        }
      };

      // Mevcut bağlantıyı kontrol et
      const existingConnection = client.voiceConnections?.get(guildId);
      if (existingConnection) {
        // Mevcut bağlantıyı kapat ve yenisini oluştur
        try {
          existingConnection.destroy();
        } catch (e) {
          console.log(`[SES] Mevcut bağlantı kapatma hatası (göz ardı edildi):`, e.message);
        }
      }

      // Yeni kalıcı bağlantı oluştur
      const connection = createPersistentConnection();

      // Başarı mesajı
      return message.reply(
        `✅ **${voiceChannel.name}** kanalına başarıyla katıldım ve kalıcı olarak ayarlandım!\n` +
        `🔄 Bağlantı kesilse bile otomatik olarak tekrar bağlanacağım.\n` +
        `⏹️ Durdurmak için \`.sesayril\` komutunu kullanın.`
      );

    } catch (error) {
      console.error("Kalıcı ses bağlantısı hatası:", error);
      return message.reply("❌ Kalıcı ses bağlantısı kurulurken bir hata oluştu.");
    }
  },
};

// Kalıcı bağlantıları temizleme fonksiyonu (export için)
module.exports.clearPersistentConnection = (guildId) => {
  persistentConnections.delete(guildId);
};

module.exports.getPersistentConnections = () => {
  return persistentConnections;
};
