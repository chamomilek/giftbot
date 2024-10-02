import TelegramBot from "node-telegram-bot-api";
import mysql from "mysql2/promise";
import { RowDataPacket } from "mysql2";

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const token = "6613684810:AAE-Ojk5QJ7h2nikOeUKw3Xe9tdDNwiR0Zs";
const connection = pool.getConnection();
const bot = new TelegramBot(token, { polling: true });
const participantsObj: { [key: string]: { id: number; username: string }[] } =
  {};
const text = "Конкурс. Участников: ";
const initOptions: TelegramBot.SendMessageOptions = {
  reply_markup: {
    inline_keyboard: [[{ text: "Участвовать", callback_data: "yes" }]],
  } as TelegramBot.InlineKeyboardMarkup,
};

bot.on("message", (msg) => {
  console.log("Message received:", msg.text);
});

bot.on("channel_post", async (msg) => {
  console.log("message channel_post", msg);
  const channel_id = msg.chat.id;

  if (msg.text?.trim() === "/start") {
    try {
      await createNewGame(channel_id);
    } catch (e) {
      console.log("createNewGame error ", e);
    }
    await bot.sendMessage(channel_id, text + "0", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Участвовать", callback_data: "participate" }],
        ],
      },
    });
  }

  if (msg.text?.toLowerCase().trim().includes("/gifts")) {
    const qty = +msg.text.replace("/gifts", "");
    console.log("here qty", qty);
    await start(channel_id, qty, msg.message_id);
  }
});

type ParticipantCount = {
  count: number;
};

bot.on("callback_query", async (callbackQuery) => {
  const msg = callbackQuery.message;
  const from = callbackQuery.from;

  const chatId = msg.chat.id;
  const user_id = from.id;
  const username = from.username || from.first_name;

  console.log("callbackQuery.data", callbackQuery);

  if (callbackQuery.data === "participate") {
    try {
      try {
        const [gameRows] = await (
          await connection
        ).execute<RowDataPacket[]>(
          `SELECT id FROM game WHERE chat_id = ? ORDER BY id DESC LIMIT 1`,
          [chatId]
        );

        if (gameRows.length === 0) {
          console.log("No game found for this chat.");
          return;
        }

        const game_id = gameRows[0].id;
        console.log("callbackQuery gameId", game_id);
        const [rows] = await (
          await connection
        ).execute<RowDataPacket[]>(
          `SELECT COUNT(*) AS count FROM participants WHERE game_id = ? AND username = ?`,
          [game_id, username]
        );

        const [allParticipants] = await (
          await connection
        ).execute<RowDataPacket[]>(
          `SELECT COUNT(*) AS count FROM participants WHERE game_id = ? `,
          [game_id]
        );

        const count = (rows[0] as ParticipantCount).count;
        const countAll = (allParticipants[0] as ParticipantCount).count;
        console.log("count", count);

        if (count === 0) {
          await (
            await connection
          ).execute(
            `INSERT INTO participants (game_id, username) VALUES (?, ?)`,
            [game_id, username]
          );

          await bot.answerCallbackQuery(callbackQuery.id, {
            text: "Вы успешно добавлены в игру!",
            show_alert: false,
          });

          await bot.editMessageText(`Конкурс. Участников: ${countAll + 1}`, {
            chat_id: chatId,
            message_id: msg?.message_id,
            reply_markup: {
              inline_keyboard: [
                [{ text: "Участвовать", callback_data: "participate" }],
              ],
            },
          });

          console.log(`Пользователь ${username} добавлен в игру`);
        } else {
          await bot.answerCallbackQuery(callbackQuery.id, {
            text: "Вы уже участвуете!",
            show_alert: false,
          });
        }
      } finally {
        (await connection).release();
      }
    } catch (error) {
      console.error("Error executing query:", error);
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: "Произошла ошибка, попробуйте позже.",
        show_alert: true,
      });
    }
  }
});

async function createNewGame(chatId: number): Promise<number> {
  try {
    // const connection =  pool.getConnection();
    const [result]: any = await (
      await connection
    ).execute<RowDataPacket[]>(`INSERT INTO game (chat_id) VALUES (?)`, [
      chatId,
    ]);

    console.log(`New game : ${result.insertId}`);
    const gameId = result.insertId;

    return gameId;
  } catch (error) {
    console.error("Error creating new game:", error);
    throw error;
  }
}

const randomizer = (max: number, usedNumbers: { [key: string]: boolean }) => {
  let value = Math.floor(Math.random() * max);
  if (usedNumbers[value.toString()]) {
    value = randomizer(max, usedNumbers);
  }

  usedNumbers[value.toString()] = true;
  return value;
};

const start = async (chatId: number, wantedQty: number, messageId?: number) => {
  const [gameRows] = await (
    await connection
  ).execute<RowDataPacket[]>(
    `SELECT id FROM game WHERE chat_id = ? ORDER BY id DESC LIMIT 1`,
    [chatId]
  );

  if (gameRows.length === 0) {
    console.log("No game found for this chat.");
    return;
  }

  const game_id = gameRows[0].id;
  const [rows] = await (
    await connection
  ).execute<RowDataPacket[]>(`SELECT * FROM participants WHERE game_id = ?`, [
    game_id,
  ]);

  console.log("partic", rows);
  const participants = rows || [];

  const usedNumbers: { [key: string]: boolean } = {};
  const totalUsers = participants.length;
  const qty = wantedQty > totalUsers ? totalUsers : wantedQty;
  let game;
  const winners: string[] = [];
  for (let i = 1; i <= qty; i++) {
    const id = randomizer(totalUsers, usedNumbers);
    const user = participants[id];
    game = user.game_id;
    console.log("winners", id, user);
    // await bot.sendMessage(user.id, "Вы выйграли");

    winners.push(
      `Победитель${qty === 1 ? "" : " " + i}: ${
        user?.username ? "@" + user.username : id
      }`
    );

    await (
      await connection
    ).execute<RowDataPacket[]>(
      `INSERT INTO winners (game_id, participant_id, winner_rank) VALUES (?, ?, ?)`,
      [game_id, user.id, i]
    );
  }

  const text = winners.length ? winners.join("\n") : "Участников нет";

  if (messageId) {
    await bot.editMessageText(text, { chat_id: chatId, message_id: messageId });
  } else {
    await bot.sendMessage(chatId, text);
  }

  participantsObj[chatId] = [];

  return;
};
