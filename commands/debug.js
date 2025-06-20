const db = require('../utils/database');

module.exports = {
  name: 'debug',
  description: 'Debug komutları ve bot durumunu gösterir',
  async execute(message, args, client) {
    // Komut listesini göster
    const commandList = Array.from(client.commands.keys()).join(', ');
    await message.reply(`🔍 **Yüklü komutlar**: ${commandList}`);
    
    // Cache durumunu kontrol et
    const cacheStatus = db.getCacheStatus();
    const cacheInfo = `📚 **Hızlı Erişim Durumu**:
- Kayıt Cache: ${cacheStatus.registrations.cached ? '✅ Aktif' : '❌ Pasif'} (${cacheStatus.registrations.recordCount} kayıt)
- Ayar Cache: ${cacheStatus.settings.cached ? '✅ Aktif' : '❌ Pasif'} (${cacheStatus.settings.guildCount} sunucu)
- Son Güncelleme: <t:${Math.floor(Math.max(cacheStatus.registrations.lastUpdated, cacheStatus.settings.lastUpdated) / 1000)}:R>`;
    
    await message.reply(cacheInfo);
    
    // Kayitkur komutunu özel olarak kontrol et
    const kayitkurCommand = client.commands.get('kayitkur');
    if (kayitkurCommand) {
      await message.reply('✅ `kayitkur` komutu yüklü!');
      
      // Komut içeriğini kontrol et
      if (typeof kayitkurCommand.execute === 'function') {
        await message.reply('✅ `kayitkur.execute` fonksiyonu mevcut!');
      } else {
        await message.reply('❌ `kayitkur.execute` fonksiyonu bulunamadı!');
      }
    } else {
      await message.reply('❌ `kayitkur` komutu bulunamadı!');
    }
    
    // Discord.js sürüm bilgisini göster
    const discordJsVersion = require('discord.js').version;
    await message.reply(`ℹ️ Discord.js sürümü: v${discordJsVersion}`);
    
    // Sunucu ve bot durumu
    const uptimeMinutes = Math.floor(client.uptime / 60000);
    const serverCount = client.guilds.cache.size;
    const ping = client.ws.ping;
    
    await message.reply(`📊 **Bot Durumu**:\n- Çalışma Süresi: ${uptimeMinutes} dakika\n- Ping: ${ping}ms\n- Sunucu Sayısı: ${serverCount}`);
  }
};