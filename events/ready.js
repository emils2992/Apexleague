module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`Hazır! ${client.user.tag} olarak giriş yapıldı.`);
    
    // Set the bot's activity
    client.user.setActivity('.k | Futbol Kayıt', { type: 'PLAYING' });
  }
};
