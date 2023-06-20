const generateMessage = async (openai, model, messages) => {
  let retries = 0;
  const maxRetries = 5;

  while (retries < maxRetries) {
    try {
      const response = await openai.createChatCompletion({
        model,
        messages,
      });
      return response;
    } catch (err) {
      console.log(`Ha ocurrido un error, reintentando (${retries + 1}/${maxRetries})`);
      retries++;
    }
  }

  console.log("Se alcanzó el máximo de intentos. No se pudo generar el mensaje.");
  return null;
};

module.exports = { generateMessage };
