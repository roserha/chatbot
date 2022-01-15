const dotenv = require('dotenv');
dotenv.config();

const { google } = require('googleapis');
const youtube = google.youtube("v3");
const util = require("util");
const fs = require("fs");
const { exception } = require('console');
//const rhbCommands = require('./commands');
const OAuth2 = google.auth.OAuth2;

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectURI = "http://localhost:2505/callback";
const redirectURIRHB = "http://localhost:2505/callback-rhb";

// scopes

const scope = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.force-ssl'
];

const auth = new OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET, redirectURI);
const authRHB = new OAuth2(process.env.CLIENT_ID_RHB, process.env.CLIENT_SECRET_RHB, redirectURIRHB);

const youtubeService = {};

// generates auth url
youtubeService.getCode = response => {
    const authUrl = auth.generateAuthUrl({
        access_type: 'offline',
        scope
    });
    response.redirect(authUrl);
};

// generates RHB auth url
youtubeService.getCodeRHB = responserhb => {
    const authUrl = authRHB.generateAuthUrl({
        access_type: 'offline',
        scope
    });
    responserhb.redirect(authUrl);
};

// saves authentication tokens

const writeFilePromise = util.promisify(fs.writeFile);
const readFilePromise = util.promisify(fs.readFile);

const save = async (path, str) => {
    await writeFilePromise(path, str);
    console.log('--- Successfuly saved tokens!');
};

const read = async path => {
    const fileContents = await readFilePromise(path);
    console.log('--- Read tokens!');
    return JSON.parse(fileContents);
};

// requests token access using login code
youtubeService.getTokensWithCode = async code => {
    const credentials = await auth.getToken(code);
    youtubeService.authorize(credentials);
};

// requests RHB token access using login code
youtubeService.getTokensWithCodeRHB = async coderhb => {
    const credentials = await authRHB.getToken(coderhb);
    youtubeService.authorizeRHB(credentials);
};

// stores tokens
youtubeService.authorize = ({ tokens }) => {
    auth.setCredentials(tokens);
    console.log("--- Successfuly set credentials!");
    save('./tokens.json', JSON.stringify(tokens));
};

// stores RHB tokens
youtubeService.authorizeRHB = ({ tokens }) => {
    authRHB.setCredentials(tokens);
    console.log("--- Successfuly set RHB's credentials!");
    save('./tokens-rhb.json', JSON.stringify(tokens));
};

// update tokens when expired
auth.on('tokens', (tokens)=>{
    if(tokens.refresh_token)
    {
        // store refreshed token
        save("./tokens.json", JSON.stringify(auth.tokens));
    }
});

// update RHB tokens when expired
authRHB.on('tokens', (tokens)=>{
    if(tokens.refresh_token)
    {
        // store refreshed token
        save("./tokens-rhb.json", JSON.stringify(authRHB.tokens));
    }
});

// read tokens from stored file
const checkTokens = async () => {
    try
    {
        const tokens = await read('./files/tokens.json')
        if(tokens)
        {
            auth.setCredentials(tokens);
            console.log("--- Tokens set for Kohfye!")
        }
        else
        {
            console.log("--- No tokens set for Kohfye!")
        }
    }
    catch
    {
        console.log("--! Couldn't read Kohfye's token! Did he log in?")
    }
    try
    {
        const tokensrhb = await read('./files/tokens-rhb.json')
        if(tokensrhb)
        {
            authRHB.setCredentials(tokensrhb);
            console.log("--- Tokens set for kohfye!")
        }
        else
        {
            console.log("--- No tokens set for kohfye!")
        }
    } 
    catch
    {
        console.log("--! Couldn't read kohfye's token! Did he log in?")
    }
};

// checkTokens();

let liveChatId;
let nextPage;
const intervalTime = 3600;
let interval;
let chatMessages = [];

youtubeService.findActiveChat = async () => {
    const response = await youtube.liveBroadcasts.list({
        auth,
        part: 'snippet',
        mine: 'true',
    });

    const latestChat = response.data.items[0];
    try
    {
        liveChatId = latestChat.snippet.liveChatId;
        console.log(`--- Chat ID found! (${liveChatId})`);
    }
    catch
    {
        console.log("--- Failed to get active chat. Is the stream live?");
    }
};


youtubeService.getChatMessages = async () => {
    if(liveChatId == "")
    {
        console.log("--- No live chat ID found! Have you gotten it yet?");
    }
    else
    {
        const response = await youtube.liveChatMessages.list({
            auth,
            liveChatId,
            "part": [
            "snippet", "authorDetails"
            ],
            pageToken: nextPage
        }
        );
        const { data } = response;
        const newMessages = data.items;
        chatMessages.push(...newMessages);
        nextPage = data.nextPageToken;
        newMessages.forEach(element => {
           youtubeService.interpret(element).then((messageToSend) => {
                if(messageToSend != "") { youtubeService.sendMessage(messageToSend); }
           });
        });
        console.log(`--- Total Chat Messages: ${chatMessages.length}`)
    }
};

youtubeService.trackChat = async () => {
    interval = setInterval(youtubeService.getChatMessages, intervalTime);
    console.log("--- Started tracking chat!");
};

youtubeService.untrackChat = async () => {
    clearInterval(interval);
    console.log("--- Stopped tracking chat!");
};

youtubeService.sendMessage = (messageContent) => {
    console.log(`--- Sending message "${messageContent}" on chat "${liveChatId}"!`)
    youtube.liveChatMessages.insert({
        auth,
        "part": [
          "snippet"
        ],
        "resource": {
          "snippet": {
            "type": "textMessageEvent",
            liveChatId,
            "textMessageDetails": {
              "messageText": messageContent
            }
          }
        }
      }, (response) => { if(response) { console.log(`--! Response: ${response}`); }});
};

///////////////////////////////////////////////////////////////////////////////////////////////
//  MESSAGES
///////////////////////////////////////////////////////////////////////////////////////////////

const byteCamPath = "D:/Projects/Visual Studio Projects/C++/ByteCamera/x64/Debug/";

const superSwearExterminator = require("./superSwearExterminator.js");

const rickyDatabase = require("./databaseMgr.js");
const currencyNameSingular = "Mug of Coffee";
const currencyNamePlural = "Mugs of Coffee";
const currencyNameSingularShort = "Mug";
const currencyNamePluralShort = "Mugs";

// Guessing Dictionary (For limiting guesses)
let guessingUsers = {};

// TTS Messages to Say (+ way to access it and clean it)
let TTSArray = [];

youtubeService.getTTS = () => { return TTSArray; };
youtubeService.clearTTS = () => { TTSArray = []; };

// Purchase Alerts (+ way to access them and reset them)
let PAlerts = [];

youtubeService.getPAlerts = () => { return PAlerts; };
youtubeService.resetPAlerts = () => { PAlerts = []; };

// Product Dictionary (For the Buy command)
/* 
Just to remember, some cool ideas for exchangeable goodies are:
• Special hats for Byte (Cap, Moustache Goggles, etc.)
• Drink a cup of water (1,000 Mugs of Coffee)
• Drink a mug of coffee (10,000 Mugs of Coffee)
• End Stream (500,000 Mugs of Coffee)
• Eye Reveal on Twitter (999,999 Mugs of Coffee)
• Face Reveal on Twitter (9,999,999 Mugs of Coffee)
*/

var productsToBuy = {};

youtubeService.interpret = async (message, debug=false, responseURL=null) => {
    const productsToBuyThings = 
    {
        "debug test" :
        {
            "itemName": "Testing the Bot",
            "itemPrice": 0,
            "itemBoughtMessage": "@USERNAME wanted to test the bot."
        },
        "water" : 
        {
            "itemName": "Glass of Water",
            "itemPrice": 1000,
            "itemBoughtMessage": `Hey ${message.twitch ? "@kohfye" : "@Kohfye"}, have a glass of water, courtesy of @USERNAME!`
        }/*,
        "star glasses":
        {
            "itemName": "Star Glasses",
            "itemPrice": 0,
            "itemBoughtMessage": `${message.twitch ? "@kohfye" : "@Kohfye"}, @USERNAME bought some star glasses for you to wear!`
        }*/,
        "coffee" : 
        {
            "itemName": "Mug of Coffee",
            "itemPrice": 5000,
            "itemBoughtMessage": `Oh ${message.twitch ? "@kohfye" : "@Kohfye"}, @USERNAME gave his Mugs of Coffee to you! Drink up!`
        },
        "tts" :
        {
            "itemName": "Text to Speech Message",
            "itemPrice": 2500,
            "itemBoughtMessage": "@USERNAME, I sent your TTS message!"
        }
    };

    productsToBuy = productsToBuyThings;

    let messageContent = message.snippet.textMessageDetails.messageText;
    let responseContent = "";

    if(message.authorDetails.channelId == "UCDYKcHPCxSWOABY49EsZLPQ") 
    {
        return "";
    }
    
    let messagePrefixRaw = messageContent.substring(0,5).match(/\w*!(?=\w)/g);
    let messagePrefix = messagePrefixRaw ? messagePrefixRaw.toString() : "";
    let messageCommand = messagePrefix ? messageContent.substring(messagePrefix.length).toLowerCase().split(" ")[0] : "null";

    console.log(`--- Received message! (${messageContent})`);

    const nowDate = new Date();
    const oldDate = new Date(message.snippet.publishedAt);

    let timeInterval = (nowDate.getTime() - oldDate.getTime()) / 1000;

    if(timeInterval > 10)
    {
        console.log(`--- Message timed out! (${timeInterval}) & (${message.snippet.publishedAt})`)
        return;
    }

    if (messagePrefix && messagePrefix != "") { console.log(`--- Message had a "${messagePrefix}" prefix!`); }

    switch(messagePrefix)
    {
        // Regular commands
        case "!":
            switch(messageCommand)
            {
                // General stream/Kohfye info commands
                case "rules":
                    responseContent = "The main rule is to not be an all-around unpleasant person. So that means not insulting anyone in chat, or saying something purposefully hurtful. Also, avoid spamming!";
                    break;

                case "socials":
                    responseContent = "You can also subscribe to Kohfye on YouTube, or follow him on Twitter, @rickyhorizonyt! , and MAYBE catch some streams (like this one, maybe) on twitch.tv/kohfye!";
                    break;

                case "specs":
                    responseContent = `Kohfye has a 2019 Acer Predator Helios 300 laptop! It has an i7 9750H, a GTX 1660 Ti, and 16 GB of 2667 MHz RAM!`;
                    break;

                case "earnmugs":
                    responseContent = `To earn Mugs of Coffee, just interact with the stream on chat! Also, some commands have a chance to give you some Mugs, like the guess commands!`;
                    break;

                case "commands":
                        responseContent = `Check out https://kohfye.glitch.me/commands to see the available commands!`;
                        break;

                case "help":
                        responseContent = `Hey! I'm Botfye! I'm a custom made bot for Kohfye! Check out https://kohfye.glitch.me/ to see what I can do!`;
                        break;

                case "time":
                    let currentDate = new Date();

                    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

                    responseContent = `Where Kohfye lives, it's currently ${currentDate.toLocaleDateString('en-US', options)}, ${currentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
                    break;

                case "top3mugs":
                    var triviaArray = { ranking: [] };
                    await rickyDatabase.returnTop3(triviaArray);

                    triviaArray.ranking.forEach(element => {
                        console.log(element);
                    });

                    responseContent = `Top 3 Mug Owners:\n\n`;
                    responseContent += `1st 🥇 - ${triviaArray.ranking[0].userInfo.userChannelName.length <= 24 ? triviaArray.ranking[0].userInfo.userChannelName : triviaArray.ranking[0].userInfo.userChannelName.substring(0,21) + "..."}: ☕${triviaArray.ranking[0].moneyInfo.moneyAmount.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",")}\n`;
                    responseContent += `2nd 🥈 - ${triviaArray.ranking[1].userInfo.userChannelName.length <= 24 ? triviaArray.ranking[1].userInfo.userChannelName : triviaArray.ranking[1].userInfo.userChannelName.substring(0,21) + "..."}: ☕${triviaArray.ranking[1].moneyInfo.moneyAmount.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",")}\n`;
                    responseContent += `3rd 🥉 - ${triviaArray.ranking[2].userInfo.userChannelName.length <= 24 ? triviaArray.ranking[2].userInfo.userChannelName : triviaArray.ranking[2].userInfo.userChannelName.substring(0,21) + "..."}: ☕${triviaArray.ranking[2].moneyInfo.moneyAmount.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",")}`;
                    break;

                case "top3messages":
                    var triviaArray = { ranking: [] };
                    await rickyDatabase.returnTop3Messages(triviaArray);

                    triviaArray.ranking.forEach(element => {
                        console.log(element);
                    });

                    responseContent = `Top 3 Most Messages:\n\n`;
                    responseContent += `1st 🥇 - ${triviaArray.ranking[0].userInfo.userChannelName.length <= 24 ? triviaArray.ranking[0].userInfo.userChannelName : triviaArray.ranking[0].userInfo.userChannelName.substring(0,21) + "..."}: ${triviaArray.ranking[0].triviaInfo.messagesTrivia.messageCount.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",")} Message${(triviaArray.ranking[0].triviaInfo.messagesTrivia.messageCount != 1) ? "s" : ""}\n`;
                    responseContent += `2nd 🥈 - ${triviaArray.ranking[1].userInfo.userChannelName.length <= 24 ? triviaArray.ranking[1].userInfo.userChannelName : triviaArray.ranking[1].userInfo.userChannelName.substring(0,21) + "..."}: ${triviaArray.ranking[1].triviaInfo.messagesTrivia.messageCount.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",")} Message${(triviaArray.ranking[1].triviaInfo.messagesTrivia.messageCount != 1) ? "s" : ""}\n`;
                    responseContent += `3rd 🥉 - ${triviaArray.ranking[2].userInfo.userChannelName.length <= 24 ? triviaArray.ranking[2].userInfo.userChannelName : triviaArray.ranking[2].userInfo.userChannelName.substring(0,21) + "..."}: ${triviaArray.ranking[2].triviaInfo.messagesTrivia.messageCount.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",")} Message${(triviaArray.ranking[2].triviaInfo.messagesTrivia.messageCount != 1) ? "s" : ""}`;
                    break;

                // do top messages

                // Personal commands
                case "mymugs":
                    // console.log("--- CheckMoney command!");
                    //console.log("--- Raw Message: ", message);
                    let moneyArray = { money: -1 };

                    await rickyDatabase.returnMoney(message, moneyArray);

                    if(moneyArray.money != -1)
                    {
                        responseContent = `@${message.authorDetails.displayName}, you have ${moneyArray.money} ${(moneyArray.money != 1) ? currencyNamePlural : currencyNameSingular}! ☕`;
                    }
                    break;

                case "mymugranking":
                    // to find mug ranking, find how many people have more mugs than user, then add 1 to get their position
                    positionArray = { userPosition: -1};

                    await rickyDatabase.returnRanking(message, positionArray);

                    if(positionArray.userPosition != -1)
                    {
                        let ordinalPart = "th";

                        let lastPositionDigit = positionArray.userPosition.toString();
                        let lastDigit = parseInt(lastPositionDigit[lastPositionDigit.length-1]);

                        console.log(`--- Last Digit: ${lastDigit} (Type: ${typeof lastDigit})`)

                        switch (lastDigit)
                        {
                            case 1:
                                // console.log(`--- Last digit is ${lastDigit}, while the position's type is ${typeof positionArray.userPosition}`)
                                if(positionArray.userPosition < 10 || positionArray.userPosition > 20) { ordinalPart = "st" }
                                break;

                            case 2:
                                // console.log(`--- Last digit is ${lastDigit}, while the position's type is ${typeof positionArray.userPosition}`)
                                if(positionArray.userPosition < 10 || positionArray.userPosition > 20) { ordinalPart = "nd" }
                                break;

                            case 3:
                                // console.log(`--- Last digit is ${lastDigit}, while the position's type is ${typeof positionArray.userPosition}`)
                                if(positionArray.userPosition < 10 || positionArray.userPosition > 20) { ordinalPart = "rd" }
                                break;
                        }

                        responseContent = `@${message.authorDetails.displayName}, you're currently ${positionArray.userPosition}${ordinalPart} in the Mug ranking.${positionArray.userPosition <= 3 ? " Congratulations!" : ""}`;
                    }
                    break;

                case "mymessages":
                    let messageCountArray = { messages: -1 };

                    await rickyDatabase.returnMessageCount(message, messageCountArray);

                    if(messageCountArray.messages != -1)
                    {
                        responseContent = `@${message.authorDetails.displayName}, you sent ${messageCountArray.messages} message${messageCountArray.messages > 1 ? "s" : ""}!`;
                    }
                    break;

                case "mymessagesranking":
                        // to find messages ranking, find how many people have more messages than user, then add 1 to get their position
                        positionArray = { userPosition: -1};
    
                        await rickyDatabase.returnRankingMessage(message, positionArray);
    
                        if(positionArray.userPosition != -1)
                        {
                            let ordinalPart = "th";
    
                            let lastPositionDigit = positionArray.userPosition.toString();
                            let lastDigit = parseInt(lastPositionDigit[lastPositionDigit.length-1]);
    
                            console.log(`--- Last Digit: ${lastDigit} (Type: ${typeof lastDigit})`)
    
                            switch (lastDigit)
                            {
                                case 1:
                                    // console.log(`--- Last digit is ${lastDigit}, while the position's type is ${typeof positionArray.userPosition}`)
                                    if(positionArray.userPosition < 10 || positionArray.userPosition > 20) { ordinalPart = "st" }
                                    break;
    
                                case 2:
                                    // console.log(`--- Last digit is ${lastDigit}, while the position's type is ${typeof positionArray.userPosition}`)
                                    if(positionArray.userPosition < 10 || positionArray.userPosition > 20) { ordinalPart = "nd" }
                                    break;
    
                                case 3:
                                    // console.log(`--- Last digit is ${lastDigit}, while the position's type is ${typeof positionArray.userPosition}`)
                                    if(positionArray.userPosition < 10 || positionArray.userPosition > 20) { ordinalPart = "rd" }
                                    break;
                            }
    
                            responseContent = `@${message.authorDetails.displayName}, you're currently ${positionArray.userPosition}${ordinalPart} in the Message ranking.${positionArray.userPosition <= 3 ? " Congratulations!" : ""}`;
                        }
                        break;

                case "mytimespan":
                    let timeArray = { timeSpent: -1 };

                    await rickyDatabase.returnTenure(message, timeArray);

                    if(timeArray.messages != -1)
                    {
                        if (timeArray.timeSpent < 1) { responseContent = `@${message.authorDetails.displayName}, from what I know, this is around the first time you sent a message here! Welcome! :)`; }
                        else if (timeArray.timeSpent < 60) { responseContent = `@${message.authorDetails.displayName}, it's been ${Math.floor(timeArray.timeSpent)} second${Math.floor(timeArray.timeSpent) > 1 ?  "s" : ""} since your first message!`; }
                        else if (timeArray.timeSpent < 3600) { responseContent = `@${message.authorDetails.displayName}, it's been ${Math.floor(timeArray.timeSpent / 60)} minute${Math.floor(timeArray.timeSpent / 60) > 1 ?  "s" : ""} since your first message!`; }
                        else if (timeArray.timeSpent < 86400) { responseContent = `@${message.authorDetails.displayName}, it's been ${Math.floor(timeArray.timeSpent / 3600)} hour${Math.floor(timeArray.timeSpent / 3600) > 1 ?  "s" : ""} since your first message!`; }
                        else if (timeArray.timeSpent < 2592000) { responseContent = `@${message.authorDetails.displayName}, it's been ${Math.floor(timeArray.timeSpent / 86400)} day${Math.floor(timeArray.timeSpent / 86400) > 1 ?  "s" : ""} since your first message!`; }
                        else if (timeArray.timeSpent < 946728000) { responseContent = `@${message.authorDetails.displayName}, it's been around ${Math.floor(timeArray.timeSpent / 2592000)} month${Math.floor(timeArray.timeSpent / 2592000) > 1 ?  "s" : ""} since your first message!`; }
                        else  { responseContent = `@${message.authorDetails.displayName}, it's been around ${Math.floor(timeArray.timeSpent / 946728000)} year${Math.floor(timeArray.timeSpent / 946728000) > 1 ?  "s" : ""} since your first message!`; }
                    }
                    break;

                // Random Mug chance commands
                case "rolldice":
                    // console.log("--- Dice command!");
                    let randomDie = Math.round(Math.random() * 6 + 0.5005);
                    if(randomDie >= 1 && randomDie <= 6)
                    {
                        responseContent =  `@${message.authorDetails.displayName}, your die rolled a ${randomDie}!`;
                    }
                    else
                    {
                        await rickyDatabase.addMoney(message, 50000);
                        responseContent =  `@${message.authorDetails.displayName}, your die rolled a... ${randomDie}!? This can't be right... Have 50,000 Mugs of Coffee for the trouble! ☕`;
                    }
                    break;

                case "guessto10":
                    var numberThought = Math.round(Math.random() * 10);
                    var guessRaw = messageContent.substring(messagePrefix.length).toLowerCase().split(" ")[1];

                    console.log(guessRaw);

                    if(guessRaw == "" || !guessRaw)
                    {
                        responseContent = `For me to guess a number, you need to give me your guess! (As in "!guessto10 ${numberThought}")`;
                    }
                    else
                    {
                        var guess = parseInt(guessRaw);

                        if(isNaN(guess))
                        {
                            if(guessRaw == "<number>" || guessRaw.substring(0, 8) == "<number>") { responseContent = `@${message.authorDetails.displayName}, you need to substitute the <number> with the actual number.`; break;}
                            else { responseContent = `@${message.authorDetails.displayName}, this isn't a number.`; break;}
                        }

                        if(guess < 1 || guess > 10)
                        {
                            responseContent = `@${message.authorDetails.displayName}, the number needs to be between 1 and 10.`;
                            break;
                        }

                        if(guessingUsers[message.authorDetails.channelId])
                        {
                            var currentTime = (new Date()).getTime();
                            if(currentTime <= guessingUsers[message.authorDetails.channelId].blockedUntil)
                            {
                                var waitTime = guessingUsers[message.authorDetails.channelId].blockedUntil - currentTime;
                                var timeUnit = Math.floor(waitTime/60000) > 1 ? `${Math.round(waitTime/60000)} minute${Math.ceil(waitTime/60000) != 1 ? "s" : ""}` : `${Math.ceil(waitTime/1000)} second${Math.ceil(waitTime/1000) != 1 ? "s" : ""}`;

                                responseContent = `@${message.authorDetails.displayName}, you still need to wait ${timeUnit}.`;
                                break;
                            }
                            else if(guessingUsers[message.authorDetails.channelId].blockedUntil != 0)
                            {
                                guessingUsers[message.authorDetails.channelId] = 
                                {
                                    guesses: 0,
                                    blockedUntil: 0
                                };
                            }

                            guessingUsers[message.authorDetails.channelId].guesses++;

                            if(guessingUsers[message.authorDetails.channelId].guesses > 10)
                            {
                                var nextGuessTime = new Date();
                                nextGuessTime.setTime(nextGuessTime.getTime() + 1800000);

                                guessingUsers[message.authorDetails.channelId].blockedUntil = nextGuessTime.getTime();
                                responseContent = `@${message.authorDetails.displayName}, you've been guessing too much. To avoid spamming, you'll need to wait for 30 minutes.`;
                                break;
                            }
                        }
                        else
                        {
                            guessingUsers[message.authorDetails.channelId] = 
                            {
                                guesses: 1,
                                blockedUntil: 0
                            };
                        }
    
                        if(guess != numberThought)
                        {
                            responseContent = `Sorry @${message.authorDetails.displayName}, I was thinking of the number ${numberThought}.`;
                        }
                        else
                        {
                            await rickyDatabase.addMoney(message, 15);
                            responseContent = `Hey, nice job, @${message.authorDetails.displayName}! I was thinking of the number ${guess}! Have 15 Mugs of Coffee! ☕`;
                        }
                    }

                    break;

                case "guessto100":
                    var numberThought = Math.round(Math.random() * 100);
                    var guessRaw = messageContent.substring(messagePrefix.length).toLowerCase().split(" ")[1];

                    console.log(guessRaw);

                    if(guessRaw == "" || !guessRaw)
                    {
                        responseContent = `For me to guess a number, you need to give me your guess! (As in "!guessto100 ${numberThought}")`;
                    }
                    else
                    {
                        var guess = parseInt(guessRaw);

                        if(isNaN(guess))
                        {
                            if(guessRaw == "<number>" || guessRaw.substring(0, 8) == "<number>") { responseContent = `@${message.authorDetails.displayName}, you need to substitute the <number> with the actual number.`; break;}
                            else { responseContent = `@${message.authorDetails.displayName}, this isn't a number.`; break;}
                        }

                        if(guess < 1 || guess > 100)
                        {
                            responseContent = `@${message.authorDetails.displayName}, the number needs to be between 1 and 100.`;
                            break;
                        }

                        if(guessingUsers[message.authorDetails.channelId])
                        {
                            var currentTime = (new Date()).getTime();
                            if(currentTime <= guessingUsers[message.authorDetails.channelId].blockedUntil)
                            {
                                var waitTime = guessingUsers[message.authorDetails.channelId].blockedUntil - currentTime;
                                var timeUnit = Math.floor(waitTime/60000) > 1 ? `${Math.round(waitTime/60000)} minute${Math.ceil(waitTime/60000) != 1 ? "s" : ""}` : `${Math.ceil(waitTime/1000)} second${Math.ceil(waitTime/1000) != 1 ? "s" : ""}`;

                                responseContent = `@${message.authorDetails.displayName}, you still need to wait ${timeUnit}.`;
                                break;
                            }
                            else if(guessingUsers[message.authorDetails.channelId].blockedUntil != 0)
                            {
                                guessingUsers[message.authorDetails.channelId] = 
                                {
                                    guesses: 0,
                                    blockedUntil: 0
                                };
                            }

                            guessingUsers[message.authorDetails.channelId].guesses++;

                            if(guessingUsers[message.authorDetails.channelId].guesses > 10)
                            {
                                var nextGuessTime = new Date();
                                nextGuessTime.setTime(nextGuessTime.getTime() + 1800000);

                                guessingUsers[message.authorDetails.channelId].blockedUntil = nextGuessTime.getTime();
                                responseContent = `@${message.authorDetails.displayName}, you've been guessing too much. To avoid spamming, you'll need to wait for 30 minutes.`;
                                break;
                            }
                        }
                        else
                        {
                            guessingUsers[message.authorDetails.channelId] = 
                            {
                                guesses: 1,
                                blockedUntil: 0
                            };
                        }
    
                        if(guess != numberThought)
                        {
                            var difference = Math.abs(guess-numberThought);

                            if(difference == 1)
                            {
                                rickyDatabase.addMoney(message, 5);
                                responseContent = `Ack!! @${message.authorDetails.displayName}, I tought of ${numberThought}! That's tough... Have 5 pity Mugs... ☕`;
                            }
                            else if(difference < 5)
                            {
                                rickyDatabase.addMoney(message, 2);
                                responseContent = `Oh no, it was close, but... @${message.authorDetails.displayName}, I was thinking of ${numberThought}. Have 2 pity Mugs... ☕`;
                            }
                            else if(difference < 10)
                            {
                                rickyDatabase.addMoney(message, 1);
                                responseContent = `Aww, sorry @${message.authorDetails.displayName}, I was thinking of the number ${numberThought}. Have a pity Mug... ☕`;
                            }
                            else
                            {
                                responseContent = `Sorry @${message.authorDetails.displayName}, I was thinking of the number ${numberThought}.`;
                            }
                        }
                        else
                        {
                            await rickyDatabase.addMoney(message, 200);
                            responseContent = `Woah! Great job, @${message.authorDetails.displayName}! I was thinking of the number ${guess}! Have 200 Mugs of Coffee! ☕`;
                        }
                    }

                    break;

                case "guessto1k":
                    var numberThought = Math.round(Math.random() * 1000);
                    var guessRaw = messageContent.substring(messagePrefix.length).toLowerCase().split(" ")[1];

                    console.log(guessRaw);

                    if(guessRaw == "" || !guessRaw)
                    {
                        responseContent = `For me to guess a number, you need to give me your guess! (As in "!guessto1k ${numberThought}")`;
                    }
                    else
                    {
                        var guess = parseInt(guessRaw);

                        if(isNaN(guess))
                        {
                            if(guessRaw == "<number>" || guessRaw.substring(0, 8) == "<number>") { responseContent = `@${message.authorDetails.displayName}, you need to substitute the <number> with the actual number.`; break;}
                            else { responseContent = `@${message.authorDetails.displayName}, this isn't a number.`; break;}
                        }

                        if(guess < 1 || guess > 1000)
                        {
                            responseContent = `@${message.authorDetails.displayName}, the number needs to be between 1 and 1000.`;
                            break;
                        }

                        if(guessingUsers[message.authorDetails.channelId])
                        {
                            var currentTime = (new Date()).getTime();
                            if(currentTime <= guessingUsers[message.authorDetails.channelId].blockedUntil)
                            {
                                var waitTime = guessingUsers[message.authorDetails.channelId].blockedUntil - currentTime;
                                var timeUnit = Math.floor(waitTime/60000) > 1 ? `${Math.round(waitTime/60000)} minute${Math.ceil(waitTime/60000) != 1 ? "s" : ""}` : `${Math.ceil(waitTime/1000)} second${Math.ceil(waitTime/1000) != 1 ? "s" : ""}`;

                                responseContent = `@${message.authorDetails.displayName}, you still need to wait ${timeUnit}.`;
                                break;
                            }
                            else if(guessingUsers[message.authorDetails.channelId].blockedUntil != 0)
                            {
                                guessingUsers[message.authorDetails.channelId] = 
                                {
                                    guesses: 0,
                                    blockedUntil: 0
                                };
                            }

                            guessingUsers[message.authorDetails.channelId].guesses++;

                            if(guessingUsers[message.authorDetails.channelId].guesses > 10)
                            {
                                var nextGuessTime = new Date();
                                nextGuessTime.setTime(nextGuessTime.getTime() + 1800000);

                                guessingUsers[message.authorDetails.channelId].blockedUntil = nextGuessTime.getTime();
                                responseContent = `@${message.authorDetails.displayName}, you've been guessing too much. To avoid spamming, you'll need to wait for 30 minutes.`;
                                break;
                            }
                        }
                        else
                        {
                            guessingUsers[message.authorDetails.channelId] = 
                            {
                                guesses: 1,
                                blockedUntil: 0
                            };
                        }

                        if(guess != numberThought)
                        {
                            var difference = Math.abs(guess-numberThought);

                            if(difference == 1)
                            {
                                rickyDatabase.addMoney(message, 10);
                                responseContent = `ARE YOU KIDDING ME!?!? @${message.authorDetails.displayName}, I tought of ${numberThought}! 1 off! That's rough... Have 10 pity Mugs... ☕`;
                            }
                            else if(difference < 5)
                            {
                                rickyDatabase.addMoney(message, 5);
                                responseContent = ` Gahh!! @${message.authorDetails.displayName}, I was thinking of ${numberThought}! Have 5 pity Mugs... ☕`;
                            }
                            else if(difference < 10)
                            {
                                rickyDatabase.addMoney(message, 2);
                                responseContent = `Oh no, so close... @${message.authorDetails.displayName}, I was thinking of the number ${numberThought}... Have 2 pity Mugs... ☕`;
                            }
                            else if(difference < 50)
                            {
                                rickyDatabase.addMoney(message, 1);
                                responseContent = `Ohhh, sorry @${message.authorDetails.displayName}, I was thinking of the number ${numberThought}. Have a pity Mug... ☕`;
                            }
                            else
                            {
                                responseContent = `Sorry @${message.authorDetails.displayName}, I was thinking of the number ${numberThought}.`;
                            }
                        }
                        else
                        {
                            await rickyDatabase.addMoney(message, 2000);
                            responseContent = `WOW!!! I CAN'T BELIEVE THIS!!! @${message.authorDetails.displayName}! I WAS thinking of the number ${guess}! Congrats on your 2,000 Mugs of Coffee! ☕`;
                        }
                    }

                    break;

                // Buy command
                case "buy":
                    var itemToPurchase = messageContent.toLowerCase().split("!buy ")[1].split(" | ")[0];
                    var itemMessage = messageContent.toLowerCase().split("!buy ")[1].split(" | ")[1];

                    if(itemToPurchase == "<product name>" || itemToPurchase.substring(0, 14) == "<product name>") { responseContent = `@${message.authorDetails.displayName}, you need to substitute the <product name> with the actual product name.`; break;}

                    if(!productsToBuy[itemToPurchase]) 
                    { 
                        responseContent = `@${message.authorDetails.displayName}, for a list of products, go to https://kohfye.glitch.me/shop`; 
                        break;
                    }

                    var itemArray = productsToBuy[itemToPurchase];

                    itemArray.purchaseSuccessful = 0;

                    await rickyDatabase.makePurchase(message, itemArray);

                    console.log(`--- Purchase Successful: ${itemArray.purchaseSuccessful}`)

                    if(itemArray.purchaseSuccessful < 0)
                    {
                        responseContent = `@${message.authorDetails.displayName}, you need ☕${productsToBuy[itemToPurchase].itemPrice} to purchase that. You're missing ☕${itemArray.purchaseSuccessful * -1}.`;
                    }
                    else if(itemArray.purchaseSuccessful == 1)
                    {
                        itemArray.purchaseMessage = itemMessage;
                        itemArray.displayName = message.authorDetails.displayName;
                        await youtubeService.processPurchase(itemArray);
                        responseContent = itemArray.itemBoughtMessage.replace(/(?!@)USERNAME/g, message.authorDetails.displayName);
                    }
                    break;
            }
            break;

        // Normal message
        default:
            await rickyDatabase.newMessage(message);
            break;
    }


    // Returning message
    return responseContent;
};

youtubeService.processPurchase = async (purchaseObject) => {
    switch(purchaseObject.itemName)
    {
        case productsToBuy["debug test"].itemName:
            console.log("--- Testing alert!");
            console.log(PAlerts);
            PAlerts.push({
                title: `Hello, World!`,
                description: `<b>${purchaseObject.displayName}</b> wanted to test the purchase system!`,
                id: "placeholder"
            });
            break;

        case productsToBuy["tts"].itemName:
            var cleanMessage = superSwearExterminator.byebyeSwears(purchaseObject.purchaseMessage + " ");
            console.log("--- Sending TTS Message to TTS Array");
            console.log(TTSArray);
            TTSArray.push({
                displayName: purchaseObject.displayName,
                message: cleanMessage
            });
            console.log("--- Sending TTS Message to Purchase Alerts");
            console.log(PAlerts);
            PAlerts.push({
                title: `${purchaseObject.displayName}`,
                description: cleanMessage,
                id: "tts"
            });
            break;

        case productsToBuy["water"].itemName:
            console.log("--- Adding water alert!");
            console.log(PAlerts);
            PAlerts.push({
                title: `<i>'Water'</i> you drinking?`,
                description: `<b>${purchaseObject.displayName}</b> told Kohfye to drink some water for <mug class="mug">${purchaseObject.itemPrice}</mug>!`,
                id: "water"
            });
            break;

        case productsToBuy["coffee"].itemName:
            console.log("--- Adding coffee alert!");
            console.log(PAlerts);
            PAlerts.push({
                title: `How does this even work?`,
                description: `<b>${purchaseObject.displayName}</b> gave Kohfye a mug of coffee for <mug class="mug">${purchaseObject.itemPrice}</mug>! How that works is beyond me...`,
                id: "coffee"
            });
            break;

        case productsToBuy["star glasses"].itemName:
            console.log("--- Adding star glasses alert!");
            console.log(PAlerts);
            PAlerts.push({
                title: `<i>Star</i>-t wearing this!`,
                description: `<b>${purchaseObject.displayName}</b> gave Kohfye some star glasses to wear, for <mug class="mug">${purchaseObject.itemPrice}</mug>! Nice!`,
                id: "coffee"
            });
            writeFilePromise(byteCamPath + "accessories.json", JSON.stringify({accessory: "star-glasses", purchaseTime: new Date()}));
            break;
    }
};

module.exports = youtubeService;