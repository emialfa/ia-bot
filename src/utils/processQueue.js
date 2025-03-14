const queue = [];
let isProcessing = false;

async function processQueue() {
  if (isProcessing || queue.length === 0) return;

  isProcessing = true;

  while (queue.length > 0) {
    const { callbackData, callback } = queue.shift(); // Tomamos el primer mensaje
    try {
      await callback(); // Llamamos al callback con éxito
    } catch (error) {
      console.log(
        "Error realizando acción: " + callbackData,
        error.message || error,
        error.stack || ""
      );
    }
  }

  isProcessing = false;

  // Volver a ejecutar solo si hay más mensajes
  if (queue.length > 0) {
    processQueue();
  }
}

// Agregar mensaje a la cola con callback
function enqueueCallback(callbackData, callback) {
  queue.push({ callbackData, callback });

  // Si no se está procesando, iniciar el procesamiento
  if (!isProcessing) {
    processQueue();
  }
}

module.exports = { enqueueCallback };
