/**
 * GOOGLE APPS SCRIPT PARA GMAIL (Banco Itaú Paraguay -> Kiosko Validador)
 * 
 * Instrucciones de instalación:
 * 1. Abre https://script.google.com con la cuenta de Gmail de tu amiga.
 * 2. Haz clic en "Nuevo proyecto".
 * 3. Pega todo este código en el editor (reemplazando el contenido existente).
 * 4. Cambia la variable WEBHOOK_URL con la URL pública de tu servidor (ej: de Render o Railway).
 *    Si estás probando con ngrok, pon la URL de ngrok.
 * 5. Haz clic en "Guardar" (ícono de disquete).
 * 6. Haz clic en el ícono de "Activadores" (reloj a la izquierda) -> "Añadir activador":
 *    - Función que se ejecutará: procesarCorreosItau
 *    - Fuentes del evento: Según tiempo (Time-driven)
 *    - Tipo de activador: Temporizador por minutos (Minutes timer)
 *    - Intervalo de minutos: Cada 1 minuto (o Cada 5 minutos)
 * 7. Guarda y autoriza los permisos de lectura de Gmail solicitados por Google.
 * ¡Listo! Cada vez que entre un mail de Itaú, se enviará automáticamente en menos de 60 segundos.
 */

const WEBHOOK_URL = 'https://tu-kiosko-app.onrender.com/api/webhook/email'; // <--- Cambiar por tu URL
const WEBHOOK_SECRET = 'kiosko-secreto-2026';
const LABEL_NAME = 'Procesado_Kiosko';

function procesarCorreosItau() {
  // Asegurar que existe la etiqueta para marcar procesados
  let label = GmailApp.getUserLabelByName(LABEL_NAME);
  if (!label) {
    label = GmailApp.createLabel(LABEL_NAME);
  }

  // Buscar correos de transferencias bancarias (Itaú, Banco GNB, UENO Bank)
  // Excluye los que ya tienen la etiqueta Procesado_Kiosko
  const searchQuery = '("acreditada en cuenta" OR "Transferencia Interbancaria Recibida" OR "Recibiste una transferencia") -label:' + LABEL_NAME;
  const threads = GmailApp.search(searchQuery, 0, 10);

  for (let i = 0; i < threads.length; i++) {
    const thread = threads[i];
    const messages = thread.getMessages();

    for (let j = 0; j < messages.length; j++) {
      const msg = messages[j];
      const body = msg.getPlainBody();
      const html = msg.getBody();

      // Enviar al servidor del kiosko
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
        Logger.log('Respuesta del servidor para msg ' + msg.getId() + ': ' + response.getContentText());

        // Marcar el hilo como procesado y leído
        thread.addLabel(label);
        thread.markRead();
      } catch (err) {
        Logger.log('Error enviando correo ' + msg.getId() + ': ' + err.toString());
      }
    }
  }
}
