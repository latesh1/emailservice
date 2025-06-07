import express from 'express';
import cors from 'cors';
import { EmailService } from './emailservice';

const app = express();
const port = 4000;
const emailService = new EmailService();

app.use(cors());
app.use(express.json());

app.post('/send-email', async (req, res) => {
  try {
    const result = await emailService.sendEmail(req.body);
    res.status(200).json({ message: result });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
