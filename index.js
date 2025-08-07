const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

const tenantId = "4d327925-f745-4db5-9289-df0b98195088";
const clientId = "b9b35447-b1e0-40e9-bbf1-2f28c5ca263f";
const clientSecret = "QUb8Q~EXGfZz.iiZaVh9iVuJteamMm1u3-_EeaA1";
const recipientEmail = "haipt@vbim.vn";

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

app.post("/send", async (req, res) => {
  try {
    const message = req.body.message || "No message provided";
    const token = await getAccessToken();

    // 1. Get user ID
    const userRes = await axios.get(`https://graph.microsoft.com/v1.0/users/${recipientEmail}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const userId = userRes.data.id;

    // 2. Create or reuse chat
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

    // 3. Send message
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
