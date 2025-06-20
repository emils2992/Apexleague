/**
 * Discord Futbol Kayıt Botu - Glitch için optimize edilmiştir
 * Bu bot futbol sunucuları için kayıt sistemi sağlar
 */

const { Client, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express');
require('dotenv').config();

// ========== GLITCH WEB SERVER ==========
// Glitch projelerinde, dışarıdan erişilebilir bir web sunucusu gereklidir
const app = express();
const PORT = process.env.PORT || 3000;

// Ana sayfa - Basit HTML sayfası
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Futbol Kayıt Botu</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
          .container { max-width: 500px; margin: 0 auto; padding: 20px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
          h1 { color: #5865F2; }
          .status { color: #57F287; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>⚽ Futbol Kayıt Botu</h1>
          <p class="status">Bot aktif ve çalışıyor!</p>
          <p>Discord botunuz sorunsuz bir şekilde çalışıyor.</p>
          <p>Bot süresi: ${Math.floor(process.uptime() / 60)} dakika</p>
          <hr>
          <p><small>Bu sayfa sadece bot durumunu gösterir. UptimeRobot için kullanılabilir.</small></p>
        </div>
      </body>
    </html>
  `);
});

// Basit status endpoint - Dış servisler için
app.get('/status', (req, res) => {
  res.status(200).json({
    status: 'online',
    uptime: process.uptime()
  });
});

// Web sunucusunu başlat
app.listen(PORT, () => {
  console.log(`[SERVER] Web sunucusu port ${PORT} üzerinde çalışıyor`);
});

// ========== DATA DIRECTORY SETUP ==========
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
  console.log('[SETUP] Data dizini oluşturuldu');
}

// ========== CACHE PRELOADING ==========
const db = require('./utils/database');
console.log('[SETUP] Cache ön yükleme başlatılıyor...');
db.preloadCache();

// ========== DISCORD CLIENT SETUP ==========
const client = new Client({
  intents: 32767, // ALL intents
  partials: ['MESSAGE', 'CHANNEL', 'REACTION', 'USER', 'GUILD_MEMBER']
});

// Client commands collection
client.commands = new Collection();

// ========== COMMAND LOADING ==========
console.log('[SETUP] Komutlar yükleniyor...');
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  try {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.name, command);
    console.log(`[SETUP] Komut yüklendi: ${command.name}`);
  } catch (error) {
    console.error(`[ERROR] Komut yüklenirken hata: ${file}`, error.message);
  }
}

// ========== EVENT LOADING ==========
console.log('[SETUP] Olaylar yükleniyor...');
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  try {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
    console.log(`[SETUP] Olay yüklendi: ${event.name}`);
  } catch (error) {
    console.error(`[ERROR] Olay yüklenirken hata: ${file}`, error.message);
  }
}

// ========== DISCORD LOGIN ==========
const TOKEN = process.env.TOKEN;

// Token kontrolü
if (!TOKEN) {
  console.error('[ERROR] TOKEN bulunamadı! .env dosyasını kontrol edin!');
  console.error('[INFO] .env dosyasına TOKEN=bot_token_buraya şeklinde ekleyin');
  process.exit(1);
}

// Giriş işlemi ve hata yönetimi
console.log('[AUTH] Discord\'a giriş yapılıyor...');
client.login(TOKEN)
  .then(() => {
    console.log('[AUTH] Discord\'a başarıyla giriş yapıldı!');
  })
  .catch(err => {
    console.error('[ERROR] Discord giriş hatası:', err.message);
    console.error('[ERROR] Kod:', err.code);
    
    // Token'da boşluk olabilir, temizlenmiş versiyonu deneyin
    console.log('[AUTH] Temizlenmiş token ile tekrar deneniyor...');
    setTimeout(() => {
      client.login(TOKEN.trim())
        .then(() => console.log('[AUTH] Temizlenmiş token ile giriş başarılı!'))
        .catch(altErr => {
          console.error('[ERROR] Giriş hatası devam ediyor:', altErr.message);
          console.error('[INFO] Discord Developer Portal\'dan yeni token almanız gerekebilir');
        });
    }, 3000);
  });

// ========== ERROR HANDLING ==========

// Discord client hataları
client.on('error', error => {
  console.error('[ERROR] Discord client hatası:', error.message);
});

// Yakalanmamış promise hataları
process.on('unhandledRejection', error => {
  console.error('[ERROR] Yakalanmamış Promise hatası:', error.message);
});

// İstisnalarda çökmesini engelle
process.on('uncaughtException', error => {
  console.error('[ERROR] Yakalanmamış istisna:', error.message);
  // Çökmesin diye process.exit çağırmıyoruz
});

// ========== GLITCH SPECIAL OPTIMIZATIONS ==========

// Discord aktivitesini belirli aralıklarla güncelleyerek "idle" durumuna geçmesini engelle
// Bu, Glitch'in projeyi uyku moduna almasını önlemeye yardımcı olur
setInterval(() => {
  if (client.user) {
    try {
      // Durumu değiştir (Presence)
      client.user.setActivity(`${client.guilds.cache.size} sunucu`, { type: 'WATCHING' })
        .catch(() => {}); // Hataları sessizce yok say
      
      // Konsolu kirletme
      // console.log('[INFO] Presence güncellendi - bot aktif tutuldu');
    } catch (e) {
      // Sessizce başarısız ol
    }
  }
}, 4 * 60 * 1000); // 4 dakikada bir

// Saatlik durum raporu - loglarda aktivite göster
// Bu Glitch'in projeyi aktif gördüğünden emin olmak için
setInterval(() => {
  if (client.user) {
    const serverCount = client.guilds.cache.size;
    const uptimeMinutes = Math.floor(client.uptime / 60000);
    console.log(`[STATUS] Bot ${uptimeMinutes} dakikadır çalışıyor | ${serverCount} sunucuda aktif`);
  }
}, 60 * 60 * 1000); // Her saat
