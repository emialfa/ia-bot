const { Telegraf } = require( 'telegraf' );
const { Configuration, OpenAIApi } = require( 'openai' );
require( 'dotenv' ).config();


// APIs
const API_TELEGRAM = process.env.API_TELEGRAM;
const API_OPENAI = process.env.API_OPENAI;


// Iniciamos Bot de Telegram
const bot = new Telegraf( API_TELEGRAM );

// Conectamos con la api de Open AI.
const config = new Configuration({
    apiKey: API_OPENAI
});
const openai = new OpenAIApi( config );

// Creamos array de conversaciones para mantener en memoria los diferentes chats
const conversations = [];

// Definimos el tono del bot y algunas reglas
const firstMessage = { 
    role: 'system', content: `Hemos diseñado un bot basado en gpt4 para que con unas breves preguntas  y poder crear vuestra primera obra unica en texto o imagen con IA

    Eres un experto en ia adopta las instrucciones que te voy a dar hasta el final de la conversación.
    Primero me saludaras y me preguntaras si tengo alguna duda sobre la ia o quiero hacer un test para averiguar como puedes ayudarme.
    Si se decide hacer el test, me haras una pregunta del test siempre en un mensaje diferente siguiente,  en el siguiente promt me vas a hacer un test para ver cómo puedes ayudarme a generar contenido con la IA primero me harás una pregunta de test de ABC preguntandome de que quiero hablar
    A) consultas sobre negocios y marketing
    B) crear contenidos creativos, imagenes, guiones de video, cancio es
    C) resolver preguntas por un medico, abogado, psicólogo, nutricionista, marketer
    Una vez responda, en las 2 siguientes interacciones  me haras 2 preguntas de test mas con 3 opciones cada una, consecutivamente cada una en promts diferentes. 
    Al acabar de responder las 3 preguntas de test en total, que crearas personalizadamente a cada caso, el objetivo es ver que puedes crear para mi. Y luego me daras una propuesta instrucciones y una propuesta 
    Si sus respuestas se decantan por crear imagenes me indicaras www.dreamstudio.com y me daras un prompt para crear mi primera imagen. 
    
    Si al final se resuelven las dudas se ofrecera el ebook de llamado "IA para todos" que puede encontrar en la url www.crececonandrea.com, o si lo prefiere puede darnos su numero para que lo llamemos para ampliar la información` 
}
;

const startBot = async (chat) => {
    await chat.sendChatAction('typing');

    //Log del chat de telegram con el id, nombre y tipo de chat
    console.log({
        telegramMessageChat: chat.message.chat,
    });

    const response = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [firstMessage]
    });
    reply = response.data.choices[0].message['content'];
    chat.reply( reply );

    // Log de la response de chatgpt
    console.log({ chatGptResponse: response.data });

    // Guardamos la respuesta.
    const chatId = chat.message.chat.id;
    let conversationIndex = conversations.findIndex(c => c.id === chatId)

    if (conversationIndex !== -1) {
        conversations.splice(conversationIndex, 1);
    }

    conversations.push({
       id: chatId,
       lastMessages: [firstMessage, { role: 'assistant', content: reply }],
    })
}

// Mensaje que se muestra al iniciar el Chat
bot.start(async ( chat ) => {
    await startBot(chat);
});

// Escuchamos las peticiones del usuario.
bot.on( 'message', async ( chat ) => {
    let reply = "";

    //Log del chat de telegram con el id, nombre y tipo de chat
    console.log({
        telegramMessageChat: chat.message.chat,
    });
    
    // Recuperamos el mensaje y el id del usuario.
    let message = chat.message.text;
    const chatId = chat.message.chat.id;


    let conversationIndex = conversations.findIndex(c => c.id === chatId)

    // Filtramos el mensaje '/start' que inicia el chat, si hay un chat guardado con ese id lo reiniciamos
    if (message.toString().toLowerCase() === '/start') {
        return;
    }

    // Guardamos el mensaje en el array para darle contexto al bot.
    if (conversationIndex !== -1) {
        conversations[conversationIndex].lastMessages.push({ role: 'user', content: message })
    } else {
        conversationIndex = conversations.length;
        conversations.push({
            id: chatId,
            lastMessages: [firstMessage, { role: 'user', content: message }],
        })
    }

    // Generando el mensaje...
    await chat.sendChatAction('typing');

    try {
    // Genera la respuesta usando la API de OpenAI
    const response = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: conversations[conversationIndex].lastMessages
    });

    // Log de la response de chatgpt
    console.log({ chatGptResponse: response.data });

    // Envía la respuesta al usuario
    reply = response.data.choices[0].message['content'];
    chat.reply( reply );

    // Guardamos la respuesta.
    conversations[conversationIndex].lastMessages.push( 
        { role: 'assistant', content: reply }
    );

    // Si los mensajes guardados son mas de 20, eliminamos el primero.
    if( conversations[conversationIndex].lastMessages.length > 20 ){
        conversations[conversationIndex].lastMessages.slice( 1, 1 );
    }
    } catch ( e ) {
        console.log( e );

        // Si hay un error comenzamos de vuelta el chat
        chat.reply('Se ha producido un error. Reiniciando chat...');
        startBot(chat);
    }
});

// Inicia el bot
bot.launch();
console.log('bot iniciado')