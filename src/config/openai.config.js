const { Configuration, OpenAIApi } = require("openai");

const APIKEY_OPENAI = process.env.API_OPENAI;

const config = new Configuration({
    apiKey: APIKEY_OPENAI,
});

const openai = new OpenAIApi(config);

module.exports = openai;