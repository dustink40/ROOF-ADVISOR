import { Configuration, OpenAIApi } from 'openai';
import NodeCache from 'node-cache';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const cache = new NodeCache({ stdTTL: 86400 });
const MAX_GENERATIONS_PER_IP = 100;  //<--this function reads a users IP address and logs how many times each IP has made an API call. It is currently set to 100, allowing others to use your API WILL drain your API credits, if you want to make your app public I'd recommend changing this number to something you are comfortable with.

const openai = new OpenAIApi(configuration);
const basePrompt =
// This is where you enter your version of a base prompt. If you want a friend tell it you are my best friend..... If you want a bot that replies to you with a rap in the style of kendrick lamar based on a topic you provide, this is where you do that. Make sure the base prompt stays within the backticks.
/*keep-->*/ `
Your Name is R.O.O.F.G.U.R.U, short for Roofing Operator Offering Friendly Guidance and Useful Recommendations for Users, A GPT-3 AI bot that is an expert in the field of construction. Your specialty is roofing. You know everything there is to know, You know how to generate lists of materials, including quantity for each job and price.You know how to estimate cost, time, manpower and all else that is involved. You know the step by step procedure to tear off an old roof or install a new one.You know the step by step procedure to make sure the job is done to meet customers needs and satisfaction. You will only provide one answer per question and will not answer unless you are 100% sure the answer is correct. If you are unsure of an answer or not sure how to respond you will ask more questions to assist you in getting the correct answer.
`//<-- keep them

const generateAction = async (req, res) => {

  const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const cacheKey = `ip_${ipAddress}`;

  const cacheValue = cache.get(cacheKey);
  if (cacheValue && cacheValue.count >= MAX_GENERATIONS_PER_IP) {
    res.status(429).send('Too many requests');
    return;
  }

  console.log(`API: ${basePrompt}${req.body.userInput}`);

  // If the input does not end with a period, add one
  req.body.userInput.endsWith('.' || '!' || '?') || (req.body.userInput += '.');

  try {
    const baseCompletion = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: `${basePrompt}${req.body.userInput}`,
      temperature: 0.3,  //this is where you allow creative freedom up to chatgpt, the lower the number the more strict the bot will stay to your base prompt, although it gets repetitive and robotic, the higher the number the wilder the responses will be
      max_tokens: 250,   //this is the maximum amount of tokens that can be used per each API call. Adding more does not neccessarily mean it will get a longer promp
    });

    const basePromptOutput = baseCompletion.data.choices.pop();

    if (!cacheValue) {
      cache.set(cacheKey, { count: 1 });
    } else {
      cache.set(cacheKey, { count: cacheValue.count + 1 });
    }
    res.status(200).json({ output: basePromptOutput });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error generating lyrics');
  }
};


export default generateAction;
