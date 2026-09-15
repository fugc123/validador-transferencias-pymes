import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';

const PORT = process.env.PORT || 3000;
const { app, repository } = createApp();

// Auto-purge records older than 30 days
repository.purgeOlderThan(30).then(count => {
  if (count > 0) {
    console.log(`[Purge] Limpieza automática: ${count} transferencias antiguas eliminadas.`);
  }
}).catch(console.error);

app.listen(PORT, () => {
  console.log('================================================================');
  console.log('  Validador de Transferencias para PYMEs (Itaú SIPAP Paraguay)  ');
  console.log(`  Servidor activo en: http://localhost:${PORT}                   `);
  console.log(`  Webhook URL: http://localhost:${PORT}/api/webhook/email        `);
  console.log('================================================================');
});
