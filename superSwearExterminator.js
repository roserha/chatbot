const util = require("util");
const fs = require("fs");

const sse = {};

let badWords = [];

const asyncRead = util.promisify(fs.readFile);

sse.byebyeSwears = (message) =>
{
    let filtered = `${message}`;

    console.log("--- Before filter: ", filtered);

    badWords.forEach(swear => {
        let newRegex = new RegExp(`([-!$%^&*()_+|~=\`{}\\[\\]:";'<>?,.\\/ “”’])${swear}([-!$%^&*()_+|~=\`{}\\[\\]:";'<>?,.\\/ “”’])`, 'gi');
        filtered = filtered.replace(newRegex, "$1bleep$2");
    });

    console.log("--- After filter: ", filtered);

    return filtered;
}

(function ()
{
    fs.readFile('./files/bad-word-list.txt', (err, buffer) => {
         if(err)
         {
             console.log("--- Error when loading bad word list: ", err) 
         }
    
         const data = buffer;
    
         badWords = `${data}`.split("\n");
    });
})();


module.exports = sse;