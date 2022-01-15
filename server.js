const { exec } = require('child_process');
const express = require('express');
const path = require('path');
const youtubeService = require("./youtubeService.js");
const twitchService = require("./twitchService.js")


const server = express();
const port = process.env.PORT || 2505;

const serverCmds = {};

let isRickyHBot = false;

server.use(express.urlencoded({
    extended: true
}));

server.use(express.static(__dirname + '/webpages/assets'));
server.use('/assets', express.static(__dirname + '/webpages/assets'));

// GET for index file
server.get("/", (req, res) =>
{
    if ((req.socket.remoteAddress != process.env.AUTHORIZED_IP_01 && req.socket.remoteAddress != process.env.AUTHORIZED_IP_02) && 
        (req.headers['x-forwarded-for'] != process.env.AUTHORIZED_IP_01 && req.headers['x-forwarded-for'] != process.env.AUTHORIZED_IP_02))
    {
        console.log(`user ip is: ${req.headers['x-forwarded-for']} or ${req.socket.remoteAddress}`);
        res.sendFile(path.join(__dirname + "/webpages/invalid-ip.html"));
        return;
    }
    res.sendFile(path.join(__dirname + "/webpages/index.html"))
});

///////////////////////////////
// LOGGING INTO YOUTUBE
///////////////////////////////

// GET for rh auth
server.get("/authorize", (req, res) => {
    console.log('/auth');
    youtubeService.getCode(res);
});

// GET for rh auth callback
server.get("/callback", async (req, res) => {
    const { code } = req.query;
    youtubeService.getTokensWithCode(code);
    await new Promise(r => setTimeout(r, 5000)); // sleep
    if(!isRickyHBot)
    {
        res.redirect('/find-active-chat');
    }
    else
    {
        res.redirect('/')
        console.log('--- rickyhbot is active!')
    }
});

// GET for rhb auth
server.get("/authorize-rhb", (req, res) => {
    console.log('/auth-rhb');
    isRickyHBot = true;
    youtubeService.getCode(res);
});

///////////////////////////////
// TRACKING YOUTUBE CHAT
///////////////////////////////

// GET for getting rh's chat
server.get("/find-active-chat", (req, res) => {
    youtubeService.findActiveChat();
    res.redirect("/authorize-rhb");
});

// GET for tracking chat
server.get("/track-chat", (req, res) => {
    youtubeService.trackChat();
    res.redirect("/");
});

// GET for untracking chat
server.get("/untrack-chat", (req, res) => {
    youtubeService.untrackChat();
    res.redirect("/");
});

// GET for quitting
server.get("/turn-off", (req, res) => {
    res.redirect("/");
    process.exit(0);
});

///////////////////////////////
// MANUALLY SENDING YT MESSAGES
///////////////////////////////

// POST for sending custom messages
server.post("/send-message", (req, res) => {
    if ((req.socket.remoteAddress != process.env.AUTHORIZED_IP_01 && req.socket.remoteAddress != process.env.AUTHORIZED_IP_02) && 
        (req.headers['x-forwarded-for'] != process.env.AUTHORIZED_IP_01 && req.headers['x-forwarded-for'] != process.env.AUTHORIZED_IP_02))
    {
        console.log(`user ip is: ${req.headers['x-forwarded-for']} or ${req.socket.remoteAddress}`);
        res.sendFile(path.join(__dirname + "/webpages/invalid-ip.html"));
        return;
    }
    if(req.body.youtube || req.body.both) 
    {
        console.log('--- Sending message on \x1b[31mYouTube\x1b[0m'); 
        const messageToSend = req.body.message;
        youtubeService.sendMessage(messageToSend);
    }
    if(req.body.twitch || req.body.both) 
    {
        console.log('--- Sending message on \x1b[35mTwitch\x1b[0m'); 
        const messageToSend = req.body.message;
        // twitch.sendMessage(messageToSend);
    }
    res.redirect("/");
});

///////////////////////////////
// MESSAGE SIMULATOR YT 2021
///////////////////////////////

// POST for debugging commands without using YouTube data
server.post("/debug-cmds", (req, res) => {
    if ((req.socket.remoteAddress != process.env.AUTHORIZED_IP_01 && req.socket.remoteAddress != process.env.AUTHORIZED_IP_02) && 
        (req.headers['x-forwarded-for'] != process.env.AUTHORIZED_IP_01 && req.headers['x-forwarded-for'] != process.env.AUTHORIZED_IP_02))
    {
        console.log(`user ip is: ${req.headers['x-forwarded-for']} or ${req.socket.remoteAddress}`);
        res.sendFile(path.join(__dirname + "/webpages/invalid-ip.html"));
        return;
    }
    if(req.body.youtube) 
    { 
        console.log('--- Interpreting command as \x1b[31mYouTube\x1b[0m'); 
        const messageToSend = req.body.message;
        let messageJSON = {
            "snippet": 
            { 
                "type": "textMessageEvent",
                "authorChannelId": "debugRickyhbotChannelId",
                "publishedAt": (new Date()).toISOString(),
                "textMessageDetails": 
                { 
                    "messageText" : messageToSend 
                } 
            },
            "authorDetails":
            {
                "channelId": "debugRickyhbotChannelId",
                "displayName": "Message Simulator",
                "profileImageUrl": "https://docs.mongodb.com/images/mongodb-logo.png",
                "isVerified": false,
                "isChatOwner": false,
                "isChatSponsor": false,
                "isChatModerator": true
            }
        };  
        /*var responseContent = */youtubeService.interpret(messageJSON, true, res).then(function(responseContent) 
        {
            if (responseContent != "")
            {
                res.redirect(`/?bot-response=${encodeURIComponent(responseContent)}`);
                console.log(`--- Responded with "${responseContent}"`);
            }
            else
            {
                res.redirect("/");
            }
        });
    }
    if(req.body.twitch) 
    { 
        console.log('--- Interpreting command as \x1b[35mTwitch\x1b[0m'); 
        const messageToSend = req.body.message;
        let messageJSON = {
            "snippet": 
            { 
                "type": "textMessageEvent",
                "authorChannelId": "debugRickyhbotChannelId",
                "publishedAt": (new Date()).toISOString(),
                "textMessageDetails": 
                { 
                    "messageText" : messageToSend 
                } 
            },
            "authorDetails":
            {
                "channelId": "debugRickyhbotChannelId",
                "displayName": "Message Simulator",
                "profileImageUrl": "https://docs.mongodb.com/images/mongodb-logo.png",
                "isVerified": false,
                "isChatOwner": false,
                "isChatSponsor": false,
                "isChatModerator": true
            }
        };  
        /*var responseContent = */youtubeService.interpret(messageJSON, true, res).then(function(responseContent) 
        {
            if (responseContent != "")
            {
                res.redirect(`/?bot-response=${encodeURIComponent(responseContent)}`);
                console.log(`--- Responded with "${responseContent}"`);
            }
            else
            {
                res.redirect("/");
            }
        });
    }
});

// // GET for rhb auth callback
// server.get("/callback-rhb", (req, res) => {
//     const { code } = req.query;
//     youtubeService.getTokensWithCodeRHB(code);
//     res.redirect('/');
// });

/////////////////////////////////////
// TEXT TO SPEECH AND CUSTOM ALERTS
/////////////////////////////////////

// GET for TTS Messages
server.get("/tts", (req, res) => {
    /* let object = [
        {displayName: 'personName', message: "will this work properly??"},
        {displayName: 'person123', message: "idk"}
    ]; */
    res.json(youtubeService.getTTS());
    youtubeService.clearTTS();
});

server.get("/launchtts", (req, res) => {
    if ((req.socket.remoteAddress != process.env.AUTHORIZED_IP_01 && req.socket.remoteAddress != process.env.AUTHORIZED_IP_02) && 
        (req.headers['x-forwarded-for'] != process.env.AUTHORIZED_IP_01 && req.headers['x-forwarded-for'] != process.env.AUTHORIZED_IP_02))
    {
        console.log(`user ip is: ${req.headers['x-forwarded-for']} or ${req.socket.remoteAddress}`);
        res.sendFile(path.join(__dirname + "/webpages/invalid-ip.html"));
        return;
    }
    exec(`start microsoft-edge:http://localhost:${port}/speech`);
    res.redirect('/');
});

// GET for Purchase Alerts
server.get("/p-alerts", (req, res) => {
    res.json(youtubeService.getPAlerts());
    youtubeService.resetPAlerts();
});

// GET for Speaker
server.get("/speech", (req, res) => res.sendFile(path.join(__dirname + "/webpages/speaker.html")));

// GET for Alert Page
server.get("/purchase-alerts", (req, res) => res.sendFile(path.join(__dirname + "/webpages/purchases.html")));

serverCmds.sendMessage = (messageToSend) =>
{
    youtubeService.sendMessage(messageToSend);
}

///////////////////////////////
// UPDATING BUTTONS ON HOMEPAGE
///////////////////////////////

// GET for returning the BotStatus
server.get("/botstatus", (req, res) => {
    let botStatus = {youtube: "asleep", twitch: "asleep"};
    if(isRickyHBot) { botStatus.youtube = "active"; }
    if(twitchService.getBotConnected()) { botStatus.twitch = "active"; }
    res.json(botStatus);
});

///////////////////////////////
// LOGGING ONTO TWITCH
///////////////////////////////

// GET for returning the BotStatus
server.get("/twitch-activate", (req, res) => {
    twitchService.begin();
    res.redirect("/");
});

serverCmds.print = console.log;

server.listen(port, function(){
    console.log("botfye joined the game");
});

module.exports = serverCmds;