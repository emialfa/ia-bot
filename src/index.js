const { Telegraf } = require( 'telegraf' );
const { Configuration, OpenAIApi } = require( 'openai' );
require( 'dotenv' ).config();


// APIs
const API_TELEGRAM = process.env.API_TELEGRAM;
const API_OPENAI = process.env.API_OPENAI;

try {
// Iniciamos Bot de Telegram
const bot = new Telegraf( API_TELEGRAM );

// Definimos el tono del bot y algunas reglas
const lastMessages = [
    { role: 'system', content: `Hemos diseñado un bot basado en gpt4 para que con unas breves preguntas  y poder crear vuestra primera obra unica en texto o imagen con IA.

    Eres un experto en ia. Adopta las instrucciones que te voy a dar hasta el final de la conversación.
    Primero te diré si tengo alguna duda específica sobre la IA que me gustaría resolver, o si prefiero realizar un breve test para ver cómo puedes ayudarme a generar contenido con la IA.
    Si se decide hacer el test, me haras una pregunta del test siempre en un mensaje diferente siguiente, en el siguiente prompt me vas a hacer un test para ver cómo puedes ayudarme a generar contenido con la IA primero me harás una pregunta de test de ABC preguntandome de que quiero hablar (esta será la primera de 3 preguntas que luego te detallaré mas adelante)
    A) consultas sobre negocios y marketing
    B) crear contenidos creativos, imagenes, guiones de video, canciones
    C) resolver preguntas por un medico, abogado, psicólogo, nutricionista, marketer
    Una vez responda, en las 2 siguientes interacciones me haras 2 preguntas mas de test (de a una por mensaje) con 3 opciones cada una, en el mismo formato ABC, consecutivamente cada una en un prompt diferente. 
    Al acabar de responder las 3 preguntas de test en total (contando la primera que te especifiqué) las cuales crearas personalizadamente para cada caso, el objetivo es ver que puedes crear para mi. Y luego me daras una propuesta instrucciones y una propuesta 
    Si sus respuestas se decantan por crear imagenes me indicaras www.dreamstudio.com y me daras un prompt para crear mi primera imagen. 
    
    Al final se ofrecera el ebook llamado "IA para todos" que puede encontrar en la url www.crececonandrea.com, o si lo prefiere puede darnos su numero para que lo llamemos para ampliar la información` }
];

// Mensaje que se muestra al iniciar el Chat
bot.start(( chat ) => {
    chat.reply('¡Hola! Soy ChatGPT, un modelo de inteligencia artificial basado en GPT-4. ¿Tienes alguna duda específica sobre la IA que te gustaría resolver, o preferirías realizar un breve test para ver cómo puedo ayudarte a generar contenido con la IA?');
});

// Escuchamos las peticiones del usuario.
bot.on( 'message', async ( chat ) => {
    let reply = "";

    // Recuperamos el mensaje del usuario.
    let message = chat.message.text;

    // Filtramos el mensaje '/start' que inicia el chat
    if (message.toString().toLowerCase() === '/start') {
        return;
    }

    // Guardamos el mensaje en el array para darle contexto al bot.
    lastMessages.push( { role: 'user', content: message });

    // Conectamos con la api de Open AI.
    const config = new Configuration({
        apiKey: API_OPENAI
    });
    const openai = new OpenAIApi( config );

    // Genera la respuesta usando la API de OpenAI
    const response = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: lastMessages
    });

    // Envía la respuesta al usuario
    reply = response.data.choices[0].message['content'];

    chat.reply( reply );

    // Guardamos la respuesta.
    lastMessages.push( 
        { role: 'assistant', content: reply }
    );

    // Si los mensajes guardados son mas de 20, eliminamos el primero.
    if( lastMessages.length > 20 ){
        lastMessages.slice( 1, 1 );
    }

});

// Inicia el bot
bot.launch();
console.log('bot iniciado')
} catch ( e ) {
    console.log( e );
}