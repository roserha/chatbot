const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");
const util = require("util");
const fs = require("fs");
const { cloudbilling } = require("googleapis/build/src/apis/cloudbilling");

const rickyDatabase = {};

const client = new MongoClient(process.env.DATABASE_URL, { useUnifiedTopology: true });

const asyncRead = util.promisify(fs.readFile);
const asyncWrite = util.promisify(fs.writeFile);

async function connect()
{
    console.log("--- Connecting to MongoDB!");
    try
    {
        await client.connect();
        userInfoCollection = client.db("rickyhbot").collection("userInfo");
        purchasesCollection = client.db("rickyhbot").collection("purchases");
        transfersCollection = client.db("rickyhbot").collection("transfers");
    }
    catch(err)
    {
        console.log("--! Error when connecting to MongoDB. ", err);
    }
}

async function close()
{
    console.log("--- Closing MongoDB connection.");
    await client.close();
}

// EXECUTE ON START

var userInfoCollection;
var purchasesCollection;
var transfersCollection;
connect();

// process.on("SIGINT", await close());

// Creates user if they're new
const checkUser = async (message) =>
{
    console.log("--- Checking user in database...");

    console.log("--- Looking for Id ", message.authorDetails.channelId);

    const dbResA = await userInfoCollection.findOne({ 'userInfo.userChannelId': message.authorDetails.channelId });

    console.log("--- Response A: ", dbResA);

    if(!dbResA)
    {
        console.log("--- Didn't find Id... I think this is a new user!");

        /*console.log(`--- Looking for name ${message.authorDetails.displayName}`);

        const dbResB = await userInfoCollection.findOne({ 'userInfo.userChannelName': message.authorDetails.displayName });

        console.log("--- Response B: ", dbResB);

        if(!dbResB)
        {
            console.log("--- Didn't find name...");

            console.log(`--- Looking for PFP ${message.authorDetails.profileImageUrl}`);

            const dbResC = await userInfoCollection.findOne({ 'userInfo.userPFPURL': message.authorDetails.profileImageUrl });

            console.log("--- Response C: ", dbResC);

            if(!dbResC)
            {
                console.log("--- Didn't find PFP. It's a new user!");*/

                // }
             //}
        try
        {
            let newUserBSON = JSON.parse(await asyncRead("./db-models/dbUserModel.json"));

            newUserBSON.userInfo.userChannelId = message.authorDetails.channelId;
            newUserBSON.userInfo.userChannelName = message.authorDetails.displayName;
            newUserBSON.userInfo.userPFPURL = message.authorDetails.profileImageUrl;

            newUserBSON.triviaInfo.messagesTrivia.firstMessageTime = message.snippet.publishedAt;
            newUserBSON.triviaInfo.messagesTrivia.latestMessageTime = message.snippet.publishedAt;

            const responseDb = await userInfoCollection.insertOne(newUserBSON);

            if(responseDb.result.ok) { console.log("--- Created new user!") }
        }
        catch(err)
        {
            console.log(`--! Error when creating user: ${err}`);
        }
    }
    else
    {
        console.log("--- They aren't new. Did they change their name?");

        const options = {
            projection: { "userInfo.userChannelName": 1 }
        };

        const query = 
        { 
            'userInfo.userChannelId': message.authorDetails.channelId 
        };

        const dbResB = await userInfoCollection.findOne(query, options);

        if(dbResB.userInfo.userChannelName != message.authorDetails.displayName)
        {
            console.log(`--- Yes! Let's update their name. (${dbResB.userInfo.userChannelName} vs ${message.authorDetails.displayName})`);

            const updateDoc = 
            {
                "$set":
                {
                    "userInfo.userChannelName": message.authorDetails.displayName
                }
            };
    
            const query = 
            { 
                'userInfo.userChannelId': message.authorDetails.channelId 
            };
    
            const dbResC = await userInfoCollection.updateOne(query, updateDoc);
        }
        else
        {
            console.log("--- Nah. It's alls good!");
        }
    }
};

// Sees if user exists
rickyDatabase.doesUserExist = async (displayName, existsDict) =>
{
    console.log(`--- Looking for Display Name "${displayName}"`);

    const dbResA = await userInfoCollection.findOne({ 'userInfo.userChannelName': displayName });


    if(!dbResA)
    {
        console.log("--- User doesn't exist...");

        existsDict.value = 0;
    }
    else
    {
        console.log("--- User exists!");

        existsDict.value = 1;
    }
};

// Returns how much money user has
rickyDatabase.returnMoney = async (messageArray, moneyArray) =>
{
    try
    {
        // console.log("--- Connection response: ", connection);

        const options = {
            projection: { moneyInfo: 1 }
        };

        await checkUser(messageArray, userInfoCollection);

        const query = 
        { 
            'userInfo.userChannelId': messageArray.authorDetails.channelId 
        };

        const dbResponse = await userInfoCollection.findOne(query, options)

        // console.log("--- Database's filtered response: ", dbResponse)

        moneyArray.money = dbResponse.moneyInfo.moneyAmount;
    }
    catch(err)
    {
        console.log(`--! Error when getting money: ${err}`);
    }
};

// Returns how many messages user has sent in total
rickyDatabase.returnMessageCount = async (messageArray, triviaArray) =>
{
    try
    {
        await checkUser(messageArray);

        const query =
        {
            "userInfo.userChannelId": messageArray.authorDetails.channelId
        };

        const options =
        {
            'projection': { "triviaInfo.messagesTrivia.messageCount": 1 }
        };

        const dbResponse = await userInfoCollection.findOne(query, options);

        triviaArray.messages = dbResponse.triviaInfo.messagesTrivia.messageCount;
    }
    catch(err)
    {
        console.log(`--! Error when returning message count: ${err}`);
    }
};

// Returns for how long (unix) user has watched Ricky's streams (based on messages)
rickyDatabase.returnTenure = async (messageArray, triviaArray) =>
{
    try
    {
        await checkUser(messageArray);

        const query =
        {
            "userInfo.userChannelId": messageArray.authorDetails.channelId
        };

        const options =
        {
            'projection': { "triviaInfo.messagesTrivia.firstMessageTime": 1,  "triviaInfo.messagesTrivia.latestMessageTime": 1}
        };

        const dbResponse = await userInfoCollection.findOne(query, options);

        console.log("--- Database response: ", dbResponse);

        let firstDate = new Date(dbResponse.triviaInfo.messagesTrivia.firstMessageTime);
        let latestDate = new Date();

        triviaArray.timeSpent = ((latestDate.getTime() - firstDate.getTime()) / 1000);
    }
    catch(err)
    {
        console.log(`--! Error when calculating tenure: ${err}`);
    }
};

// Returns array of users with the most Mugs of Coffee
rickyDatabase.returnTop3 = async (topArray) =>
{
    try
    {
        const options = 
        {
            'limit': 3,
            'projection': { "userInfo.userChannelName": 1, "moneyInfo.moneyAmount": 1 },
            'sort': {"moneyInfo.moneyAmount": -1, "triviaInfo.messagesTrivia.firstMessageTime": 1 }
        };

        const dbCursor = await userInfoCollection.find({}, options);

        const dbArray = await dbCursor.toArray()

        topArray.ranking = dbArray;
    }
    catch(err)
    {
        console.log(`--- Error when getting top 3: ${err}`);
    }
};

rickyDatabase.returnRanking = async (messageArray, positionArray) =>
{
    try
    {
        await checkUser(messageArray);

        const queryA = 
        {
            "userInfo.userChannelId": messageArray.authorDetails.channelId
        };

        const optionsA =
        {
            'projection': { "moneyInfo.moneyAmount": 1 }
        };

        const dbAuthorDetails = await userInfoCollection.findOne(queryA, optionsA);

        const queryB = 
        {
            "moneyInfo.moneyAmount": {"$gt": dbAuthorDetails.moneyInfo.moneyAmount }
        };

        const optionsB =
        {
            'projection': { "_id": 1 }
        }

        const dbPeopleInFront = await userInfoCollection.find(queryB, optionsB);

        positionArray.userPosition = (await dbPeopleInFront.count()) + 1;
    }
    catch(err)
    {
        console.log(`--- Error when getting ranking: ${err}`);
    }
};

// Returns array of users with the most messages sent
rickyDatabase.returnTop3Messages = async (topArray) =>
{
    try
    {
        const options = 
        {
            'limit': 3,
            'projection': { "userInfo.userChannelName": 1, "triviaInfo.messagesTrivia.messageCount": 1 },
            'sort': {"triviaInfo.messagesTrivia.messageCount": -1, "triviaInfo.messagesTrivia.firstMessageTime": 1 }
        };

        const dbCursor = await userInfoCollection.find({}, options);

        const dbArray = await dbCursor.toArray()

        topArray.ranking = dbArray;
    }
    catch(err)
    {
        console.log(`--- Error when getting top 3: ${err}`);
    }
};

rickyDatabase.returnRankingMessage = async (messageArray, positionArray) =>
{
    try
    {
        await checkUser(messageArray);

        const queryA = 
        {
            "userInfo.userChannelId": messageArray.authorDetails.channelId
        };

        const optionsA =
        {
            'projection': { "triviaInfo.messagesTrivia.messageCount": 1 }
        };

        const dbAuthorDetails = await userInfoCollection.findOne(queryA, optionsA);

        const queryB = 
        {
            "triviaInfo.messagesTrivia.messageCount": {"$gt": dbAuthorDetails.triviaInfo.messagesTrivia.messageCount }
        };

        const optionsB =
        {
            'projection': { "_id": 1 }
        }

        const dbPeopleInFront = await userInfoCollection.find(queryB, optionsB);

        positionArray.userPosition = (await dbPeopleInFront.count()) + 1;
    }
    catch(err)
    {
        console.log(`--- Error when getting ranking: ${err}`);
    }
};

// Adds moneyToAdd amount of money
rickyDatabase.addMoney = async (messageArray, moneyToAdd) =>
{
    try
    {
        await checkUser(messageArray);

        const updateDoc = 
        {
            "$inc":
            {
                "moneyInfo.moneyAmount": moneyToAdd
            }
        };

        const query = 
        { 
            'userInfo.userChannelId': messageArray.authorDetails.channelId 
        };

        const dbResponse = await userInfoCollection.updateOne(query, updateDoc);

        // console.log("--- Database's response: ", dbResponse)
    }
    catch(err)
    {
        console.log(`--! Error when accounting for : ${err}`);
    }
}

// Processes a new message (giving money, upping message count, and updating recent message)
rickyDatabase.newMessage = async (messageArray) =>
{
    try
    {
        await checkUser(messageArray);

        let messageLen = (messageArray.snippet.textMessageDetails.messageText.length);
        let moneyToAdd = Math.ceil(3840/(1856+((-80+messageLen)*messageLen)));

        console.log(`--- Giving ${moneyToAdd} Mugs!`)

        const updateDoc = 
        {
            "$inc":
            {
                "moneyInfo.moneyAmount": moneyToAdd,
                "triviaInfo.messagesTrivia.messageCount": 1
            },
            "$set":
            {
                "triviaInfo.messagesTrivia.latestMessageTime": messageArray.snippet.publishedAt
            }
        };

        const query = 
        { 
            'userInfo.userChannelId': messageArray.authorDetails.channelId 
        };

        const dbResponse = await userInfoCollection.updateOne(query, updateDoc);

        // console.log("--- Database's response: ", dbResponse)
    }
    catch(err)
    {
        console.log(`--! Error when accounting for : ${err}`);
    }
}

// Makes a new purchase, listing it on the database
rickyDatabase.makePurchase = async (messageArray, itemArray) =>
{
    try
    {
        await checkUser(messageArray);

        const queryA = 
        {
            "userInfo.userChannelId": messageArray.authorDetails.channelId
        };

        const options =
        {
            'projection': {"moneyInfo.moneyAmount": 1}
        };

        const userDbResponse = await userInfoCollection.findOne(queryA, options);

        if(userDbResponse.moneyInfo.moneyAmount < itemArray.itemPrice)
        {
            console.log(`--- Insufficient funds!`);
            itemArray.purchaseSuccessful = userDbResponse.moneyInfo.moneyAmount - itemArray.itemPrice;
            return;
        }

        let newPurchaseJSON = JSON.parse(await asyncRead("./db-models/dbPurchaseModel.json"));

        newPurchaseJSON.messageInfo.messageContent = messageArray.snippet.textMessageDetails.messageText;
        newPurchaseJSON.messageInfo.messageSentTime = messageArray.snippet.publishedAt;

        newPurchaseJSON.purchaseInfo.itemPurchased = itemArray.itemName;
        newPurchaseJSON.purchaseInfo.itemCost = itemArray.itemPrice;
        
        newPurchaseJSON.buyerInfo.buyerId = messageArray.authorDetails.channelId;
        newPurchaseJSON.buyerInfo.moneyBefore = userDbResponse.moneyInfo.moneyAmount;
        
        console.log("--- Deducting money.");
        
        newPurchaseJSON.purchaseInfo.purchaseTime = (new Date()).toISOString();
        await rickyDatabase.addMoney(messageArray, -(itemArray.itemPrice));

        itemArray.purchaseSuccessful = 1;
        
        const newUserDbResponse = await userInfoCollection.findOne(queryA, options);
        
        newPurchaseJSON.buyerInfo.moneyAfter = newUserDbResponse.moneyInfo.moneyAmount;
        
        await purchasesCollection.insertOne(newPurchaseJSON);
    }
    catch(err)
    {
        console.log(`--- Error when purchasing item: ${err}`);
    }
};

/*// Makes a mug transfer, listing it on the database
rickyDatabase.transferMugs = async (messageArray, transferAmount, displayName, transferDict) =>
{
    try
    {
        let newTransferJSON = JSON.parse(await asyncRead("./db-models/dbTransferModel.json"));

        newTransferJSON.transferInfo.transferAmount = transferAmount;
        newTransferJSON.payerInfo.payerId = messageArray.authorDetails.channelId;

        // get money before
        let queryPayer = 
        {
            "userInfo.userChannelId": messageArray.authorDetails.channelId
        };
        newTransferJSON.payerInfo.moneyBefore = 0;
        
        // get payee user info
        newTransferJSON.payeeInfo.payeeId = "";
        newTransferJSON.payeeInfo.moneyBefore = 0;


        // transfer money
        newTransferJSON.transferInfo.transferTime = "";
        // remove from payer
        // add to payee
        transferDict.purchaseSuccessful = 1;

        // recheck user data
        newTransferJSON.payerInfo.moneyAfter = 0;
        newTransferJSON.payeeInfo.moneyAfter = 0;

        const transferDb = await transfersCollection.insertOne(newTransferJSON);
    }
    catch(err)
    {
        console.log("--- Error when transfering: ", err)
    }
};*/


module.exports = rickyDatabase;