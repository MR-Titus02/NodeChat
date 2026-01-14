import axios from "axios";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

export const sendTelegramMessage = async ({ from, text, image }) => {
  if (!BOT_TOKEN || !CHAT_ID) return;

  let message = `📩 *New Message*\n`;
  message += `From: *${from}*\n\n`;

  if (text) message += text;
  if (image && !text) message += "📷 Image received";

  try {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
  } catch (err) {
    console.error("Telegram send failed:", err.response?.data || err.message);
  }
};
