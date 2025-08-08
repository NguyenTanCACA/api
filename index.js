const express = require("express");
const axios = require("axios");
require("dotenv").config();
const cors = require("cors");
const app = express();
app.use(cors());
console.log("🚀 App is setting up routes and middlewares...111");

app.use(express.json());
console.log("🚀 App is setting up routes and middlewares...");

const tenantId = process.env.TENANT_ID;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const recipientEmail = process.env.RECIPIENT_EMAIL;

let tokenCache = null;

async function getAccessToken() {
  if (tokenCache && tokenCache.expires > Date.now()) return tokenCache.token;

  const res = await axios.post(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  tokenCache = {
    token: res.data.access_token,
    expires: Date.now() + res.data.expires_in * 1000 - 60000,
  };

  return tokenCache.token;
}

app.get("/", (req, res) => {
  res.send("✅ API is running.");
});

app.post("/send", async (req, res) => {
  console.log("📩 Received POST /send");
  try {
    const message = req.body.message || "No message provided";
    const token = await getAccessToken();

    const userRes = await axios.get(`https://graph.microsoft.com/v1.0/users/${recipientEmail}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const userId = userRes.data.id;

    const chatRes = await axios.post(
      "https://graph.microsoft.com/v1.0/chats",
      {
        chatType: "oneOnOne",
        members: [
          {
            "@odata.type": "#microsoft.graph.aadUserConversationMember",
            roles: ["owner"],
            "user@odata.bind": `https://graph.microsoft.com/v1.0/users/${userId}`,
          },
        ],
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const chatId = chatRes.data.id;

    await axios.post(
      `https://graph.microsoft.com/v1.0/chats/${chatId}/messages`,
      { body: { content: message } },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.status(200).json({ success: true, sent: message });
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
    res.status(500).json({ error: err.message, details: err.response?.data });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ API running at http://localhost:${port}`));
// console.log(`Server is running on port ${port}`);
