const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

const config = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(config);

module.exports = openai;
