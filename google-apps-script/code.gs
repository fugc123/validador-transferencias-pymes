/**
 * GOOGLE APPS SCRIPT PARA GMAIL (Banco Itaú, GNB, UENO Paraguay -> Kiosko Validador)
 * 
 * Instrucciones de instalación:
 * 1. Abre https://script.google.com con tu cuenta de Gmail.
 * 2. Reemplaza todo el código por este contenido.
 * 3. Configura WEBHOOK_URL con la URL de Cloudflare o Render.
 * 4. Guarda y haz clic en "Ejecutar" para probar.
 */

const WEBHOOK_URL = 'https://cruise-pet-painting-amp.trycloudflare.com/api/webhook/email';
const WEBHOOK_SECRET = 'kiosko-secreto-2026';
const LABEL_NAME = 'Procesado_Kiosko';

function procesarCorreosItau() {
  let label = GmailApp.getUserLabelByName(LABEL_NAME);
  if (!label) {
    label = GmailApp.createLabel(LABEL_NAME);
  }

  // Búsqueda flexible de correos bancarios que aún no fueron procesados
  const searchQuery = '("itau" OR "transferencia" OR "acreditada" OR "comprobante" OR "gnb" OR "ueno") -label:' + LABEL_NAME;
  Logger.log('🔍 1. Buscando correos con filtro: ' + searchQuery);

  const threads = GmailApp.search(searchQuery, 0, 10);
  Logger.log('📬 2. Cantidad de hilos coincidentes encontrados: ' + threads.length);

  if (threads.length === 0) {
    Logger.log('⚠️ No se encontraron hilos con el filtro. Inspeccionando los últimos 5 correos de Recibidos:');
    const inboxThreads = GmailApp.getInboxThreads(0, 5);
    for (let k = 0; k < inboxThreads.length; k++) {
      const subj = inboxThreads[k].getFirstMessageSubject();
      const labels = inboxThreads[k].getLabels().map(function(l) { return l.getName(); }).join(', ');
      Logger.log('   - Asunto: "' + subj + '" | Etiquetas: [' + labels + ']');
    }
    return;
  }

  for (let i = 0; i < threads.length; i++) {
    const thread = threads[i];
    const messages = thread.getMessages();

    for (let j = 0; j < messages.length; j++) {
      const msg = messages[j];
      const body = msg.getPlainBody();
      const html = msg.getBody();

      Logger.log('➡️ Procesando correo: "' + msg.getSubject() + '" (ID: ' + msg.getId() + ')');

      try {
        const payload = JSON.stringify({
          text: body,
          html: html,
          subject: msg.getSubject(),
          date: msg.getDate().toISOString(),
          secret: WEBHOOK_SECRET
        });

        const options = {
          method: 'post',
          contentType: 'application/json',
          headers: {
            'X-Webhook-Secret': WEBHOOK_SECRET
          },
          payload: payload,
          muteHttpExceptions: true
        };

        const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
        const respText = response.getContentText();
        Logger.log('✅ Servidor respondió (HTTP ' + response.getResponseCode() + '): ' + respText);

        // Si el servidor lo aceptó (200 o 201), marcar como procesado
        if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
          thread.addLabel(label);
          thread.markRead();
          Logger.log('🏷️ Etiqueta ' + LABEL_NAME + ' agregada con éxito.');
        } else {
          Logger.log('⚠️ El servidor devolvió error o no reconoció el formato.');
        }
      } catch (err) {
        Logger.log('❌ Error enviando correo ' + msg.getId() + ': ' + err.toString());
      }
    }
  }
}
