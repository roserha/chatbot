const youtubeService = require("./youtubeService.js");
const tmi = require(`tmi.js`);

// functions to be used on server
const twitchService = {};
const client = new tmi.client({
    identity: {
        username: "rickyhbot",
        password: process.env.TWITCH_BOT_OAUTHTOK
    },
    channels: ["horiizyn"]
});

// used to update the twitch button
let botConnected = false;
twitchService.getBotConnected = () => { return botConnected; };

// chat target (needs to be defined after message)
let chatTarget = null;

// connects to the chat
twitchService.begin = async () => {
    client.connect().then((data) => {
        console.log(`--- Twitch Bot Connected! (${data[0]}:${data[1]})`);
        botConnected = true;

        client.on("message", twitchService.onMessageReceived)
    }, (err) => {
        console.log('\x1b[31m%s\x1b[0m', `--! Error when connecting Twitch Bot: `, err);
    });
};

twitchService.sendMessage = async (message, target = chatTarget) => {
    await client.say(target, message);
};

twitchService.onMessageReceived = async (target, context, msg, self) => 
{
    if(self) { return; }
    let newMessageJSON = {
        "snippet": 
        { 
            "type": "textMessageEvent",
            "authorChannelId": `twitch-${context["user-id"]}`,
            "publishedAt": (new Date()).toISOString(),
            "textMessageDetails": 
            { 
                "messageText" : msg 
            } 
        },
        "authorDetails":
        {
            "channelId": `twitch-${context["user-id"]}`,
            "displayName": context["display-name"],
            "profileImageUrl": "https://images-na.ssl-images-amazon.com/images/I/21kRx-CJsUL.png",
            "isVerified": context.badges.verified ? true : false,
            "isChatOwner": context["room-id"] == context["user-id"],
            "isChatSponsor": false,
            "isChatModerator": context.mod
        },
        "twitch": "yes"
    };

    let response = await youtubeService.interpret(newMessageJSON);
    if(response !=  "") { twitchService.sendMessage(response, target); }
};

module.exports = twitchService;