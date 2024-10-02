"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
// replace the value below with the Telegram token you receive from @BotFather
const token = '6613684810:AAE-Ojk5QJ7h2nikOeUKw3Xe9tdDNwiR0Zs';
// Create a bot that uses 'polling' to fetch new updates
const bot = new node_telegram_bot_api_1.default(token, { polling: true });
const participantsObj = {};
const text = "Конкурс. Участников: ";
const initOptions = {
    reply_markup: {
        inline_keyboard: [
            [{ text: 'Участвовать', callback_data: 'yes' }]
        ]
    }
};
const randomizer = (max, usedNumbers) => {
    let value = Math.floor(Math.random() * max);
    if (usedNumbers[value.toString()]) {
        value = randomizer(max, usedNumbers);
    }
    usedNumbers[value.toString()] = true;
    return value;
};
const addParticipant = async ({ chatId, username, userId, messageId }) => {
    if (!participantsObj[chatId])
        participantsObj[chatId] = [];
    const participants = participantsObj[chatId];
    if (username && !participants.some((p) => p.username === username)) {
        participants.push({ id: userId, username });
        if (userId) {
            try {
                await bot.forwardMessage(userId, chatId, messageId);
                await bot.sendMessage(userId, "Вы участвуете");
            }
            catch (e) {
                console.log("sendMessage to user error:", e);
            }
        }
    }
    console.log("participants", participants);
};
const start = async (chatId, wantedQty, messageId) => {
    console.log("participantsObj", participantsObj);
    const participants = participantsObj[chatId] || [];
    const usedNumbers = {};
    const totalUsers = participants.length;
    const qty = wantedQty > totalUsers ? totalUsers : wantedQty;
    const winners = [];
    for (let i = 1; i <= qty; i++) {
        const id = randomizer(totalUsers, usedNumbers);
        const user = participants[id];
        await bot.sendMessage(user.id, "Вы выйграли");
        winners.push(`Победитель${qty === 1 ? "" : " " + i}: ${(user === null || user === void 0 ? void 0 : user.username) ? "@" + user.username : id}`);
    }
    const text = winners.length ? winners.join("\n") : "Участников нет";
    if (messageId) {
        await bot.editMessageText(text, { chat_id: chatId, message_id: messageId });
    }
    else {
        await bot.sendMessage(chatId, text);
    }
    participantsObj[chatId] = [];
    return;
};
const init = async (chatId, messageId) => {
    if (messageId) {
        await bot.editMessageText(text + "0", { chat_id: chatId, message_id: messageId });
        await bot.editMessageReplyMarkup(initOptions.reply_markup, { chat_id: chatId, message_id: messageId });
    }
    else {
        await bot.sendMessage(chatId, text + "0", initOptions);
    }
};
bot.onText(/\/start(.+)/, async (msg, _match) => {
    console.log("message", msg);
    const chatId = msg.chat.id;
    await init(chatId);
});
bot.onText(/\/gifts(.+)/, async (msg, match) => {
    console.log("message", msg);
    const chatId = msg.chat.id;
    const resp = (match === null || match === void 0 ? void 0 : match[1]) || '';
    const arrayParams = (resp || "").trim().split(" ");
    await start(chatId, +arrayParams[0]);
});
bot.on('channel_post', async (msg) => {
    var _a;
    console.log("message", msg);
    const chatId = msg.chat.id;
    if (msg.text === "/start") {
        await init(msg.chat.id, msg.message_id);
    }
    if ((_a = msg.text) === null || _a === void 0 ? void 0 : _a.includes("/gifts")) {
        const qty = +(msg.text.replace("/gifts", ""));
        await start(chatId, qty, msg.message_id);
    }
});
bot.on('callback_query', async (callbackQuery) => {
    console.log(callbackQuery);
    const msg = callbackQuery.message;
    const from = callbackQuery.from;
    const chatId = msg === null || msg === void 0 ? void 0 : msg.chat.id;
    const chatUser = (from === null || from === void 0 ? void 0 : from.id) ? await bot.getChatMember(chatId, from.id) : undefined;
    console.log("chatUser", chatUser);
    await addParticipant({ chatId: chatId, username: chatUser === null || chatUser === void 0 ? void 0 : chatUser.user.username, userId: chatUser === null || chatUser === void 0 ? void 0 : chatUser.user.id, messageId: msg === null || msg === void 0 ? void 0 : msg.message_id });
    const participants = participantsObj[chatId] || [];
    await bot.editMessageText(text + participants.length, { chat_id: chatId, message_id: msg === null || msg === void 0 ? void 0 : msg.message_id });
    await bot.editMessageReplyMarkup(initOptions.reply_markup, { chat_id: chatId, message_id: msg === null || msg === void 0 ? void 0 : msg.message_id });
});
