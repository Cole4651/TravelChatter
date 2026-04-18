const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/travelchatter';
const JWT_SECRET = process.env.JWT_SECRET || 'travelchatter_secret';

const User = require('./models/User');

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB connected');
}).catch((error) => {
  console.error('MongoDB connection error:', error);
});

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

app.use(bodyParser.json());
app.use(express.static('public'));

// Mock data for demo
const travelPolicies = {
  visa: "Check destination visa requirements 2 weeks in advance",
  approval: "Flights over $500 need manager approval",
  hotels: "Preferred hotels have negotiated rates",
  expenses: "Submit expense reports within 7 days"
};

const tripStages = {
  planning: "preparing for trip",
  approval: "getting approvals",
  travel: "on the trip",
  issues: "handling problems",
  post: "after trip"
};

const systemPrompt = `
You are TravelChatter, an intelligent travel companion copilot for business travelers.
You help with planning, approvals, travel issues, and follow-up.
Always be helpful, clear, and respect privacy.
Current policies: ${JSON.stringify(travelPolicies)}
Stages: ${JSON.stringify(tripStages)}
`;

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return res.status(401).json({ error: 'Missing auth token' });
  }

  jwt.verify(token, JWT_SECRET, async (error, payload) => {
    if (error || !payload || !payload.email) {
      return res.status(401).json({ error: 'Invalid auth token' });
    }

    const user = await User.findOne({ email: payload.email });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  });
}

app.post('/register', async (req, res) => {
  const email = (req.body.email || '').toLowerCase().trim();
  const password = req.body.password || '';

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({ email, passwordHash });

  res.json({ success: true, message: 'Account created successfully.' });
});

app.post('/login', async (req, res) => {
  const email = (req.body.email || '').toLowerCase().trim();
  const password = req.body.password || '';

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token, email: user.email });
});

app.get('/me', authenticateToken, (req, res) => {
  res.json({ success: true, email: req.user.email });
});

app.post('/chat', authenticateToken, async (req, res) => {
  const userMessage = req.body.message;
  const stage = req.body.stage || 'planning';

  const mockResponses = {
    planning: {
      "what do i need": "For your trip, you'll need: passport valid for 6 months, visa if required, company approval for flights over $500, and expense policy review.",
      "policies": "Company policies include: preferred airlines for discounts, hotel booking through approved vendors, and meal per diems.",
      "approvals": "You need manager approval for flights over $500. I'll prepare the request for you.",
      "options": "Flight options: Economy $450 (flexible), Business $1200 (premium). Hotel: Standard $150/night, Premium $250/night."
    },
    approval: {
      "approval": "Your flight request needs approval. I've submitted it to your manager. Status: Pending.",
      "status": "Approval status: Approved. You can proceed with booking.",
      "rejected": "Approval was rejected due to budget constraints. Suggested: Choose economy class or adjust dates."
    },
    travel: {
      "delayed": "Flight delayed? Check airline app for updates. If >2 hours, contact travel desk for rebooking assistance.",
      "contact": "For immediate help: Travel desk 1-800-TRAVEL, or your manager.",
      "covered": "Covered: Flight changes due to weather. Not covered: Personal delays."
    },
    issues: {
      "canceled": "Flight canceled? I'll help you rebook. Options: Next flight today or refund + new booking.",
      "help": "Contact airline directly first, then travel desk if needed. Here's the escalation path."
    },
    post: {
      "after": "After trip: Submit expense report within 7 days, complete trip feedback survey.",
      "follow": "Reminders set: Expense submission due in 3 days, feedback survey."
    }
  };

  let response = "I'm here to help with your travel needs. Can you be more specific?";

  if (!openai) {
    const stageResponses = mockResponses[stage] || {};
    for (const key in stageResponses) {
      if (userMessage.toLowerCase().includes(key)) {
        response = stageResponses[key];
        break;
      }
    }
    return res.json({ response });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Stage: ${stage}. User: ${userMessage}` }
      ],
      max_tokens: 500,
    });

    response = completion.choices[0].message.content;
    res.json({ response });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'AI service unavailable' });
  }
});

app.listen(port, () => {
  console.log(`TravelChatter running on http://localhost:${port}`);
});