const express = require('express');
const app = express();
app.use(express.json());

app.post('/send-message', (req, res) => {
  const { text1, text2 } = req.body;
  const message = `${text1}\n${text2}`;
  console.log("Tin nhắn nhận:", message);
  res.send({ status: 'Đã nhận được tin nhắn', content: message });
});

app.get('/', (req, res) => {
  res.send("Server đang chạy");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server đang chạy tại cổng ${port}`);
});
