const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Groq = require('groq-sdk');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/travelchatter';
const JWT_SECRET = process.env.JWT_SECRET || 'travelchatter_secret';

const User = require('./models/User');
const Trip = require('./models/Trip');
const ChatMessage = require('./models/ChatMessage');

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB connected');
}).catch((error) => {
  console.error('MongoDB connection error:', error);
});

app.use(bodyParser.json());
app.use(express.static('public'));

const travelPolicies = {
  visa: "Check destination visa requirements 2 weeks in advance",
  approval: "Flights over $500 need manager approval",
  hotels: "Preferred hotels have negotiated rates",
  expenses: "Submit expense reports within 7 days"
};

const baseSystemPrompt = `
You are TravelChatter, an intelligent travel companion copilot for business travelers.
You help with planning, approvals, travel issues, and follow-up.
Always be helpful, clear, and respect privacy.
Reference the current trip context (destination, dates, itinerary) when answering.
Company policies: ${JSON.stringify(travelPolicies)}
`;

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

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

async function loadUserTrip(req, res, next) {
  const trip = await Trip.findOne({ _id: req.params.tripId, userId: req.user._id });
  if (!trip) {
    return res.status(404).json({ error: 'Trip not found' });
  }
  req.trip = trip;
  next();
}

// Auth

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

// Trips

app.get('/api/trips', authenticateToken, async (req, res) => {
  const trips = await Trip.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, trips });
});

app.post('/api/trips', authenticateToken, async (req, res) => {
  const { name, destination, startDate, endDate, purpose, status } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Trip name is required.' });
  }

  const trip = await Trip.create({
    userId: req.user._id,
    name: name.trim(),
    destination: destination || '',
    startDate: startDate || null,
    endDate: endDate || null,
    purpose: purpose || '',
    status: status || 'planning',
  });

  res.json({ success: true, trip });
});

app.get('/api/trips/:tripId', authenticateToken, loadUserTrip, (req, res) => {
  res.json({ success: true, trip: req.trip });
});

app.patch('/api/trips/:tripId', authenticateToken, loadUserTrip, async (req, res) => {
  const fields = ['name', 'destination', 'startDate', 'endDate', 'purpose', 'status'];
  for (const field of fields) {
    if (req.body[field] !== undefined) {
      req.trip[field] = req.body[field];
    }
  }
  await req.trip.save();
  res.json({ success: true, trip: req.trip });
});

app.delete('/api/trips/:tripId', authenticateToken, loadUserTrip, async (req, res) => {
  await ChatMessage.deleteMany({ tripId: req.trip._id });
  await req.trip.deleteOne();
  res.json({ success: true });
});

// Itinerary

app.post('/api/trips/:tripId/itinerary', authenticateToken, loadUserTrip, async (req, res) => {
  const { title, type, date, time, location, notes } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Itinerary item title is required.' });
  }

  req.trip.itinerary.push({
    title: title.trim(),
    type: type || 'other',
    date: date || null,
    time: time || '',
    location: location || '',
    notes: notes || '',
  });

  await req.trip.save();
  res.json({ success: true, trip: req.trip });
});

app.delete('/api/trips/:tripId/itinerary/:itemId', authenticateToken, loadUserTrip, async (req, res) => {
  const item = req.trip.itinerary.id(req.params.itemId);
  if (!item) {
    return res.status(404).json({ error: 'Itinerary item not found.' });
  }
  item.deleteOne();
  await req.trip.save();
  res.json({ success: true, trip: req.trip });
});

// Chat (per-trip)

app.get('/api/trips/:tripId/messages', authenticateToken, loadUserTrip, async (req, res) => {
  const messages = await ChatMessage.find({ tripId: req.trip._id }).sort({ createdAt: 1 });
  res.json({ success: true, messages });
});

app.post('/api/trips/:tripId/chat', authenticateToken, loadUserTrip, async (req, res) => {
  const userMessage = (req.body.message || '').trim();
  if (!userMessage) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  await ChatMessage.create({
    tripId: req.trip._id,
    role: 'user',
    content: userMessage,
  });

  const tripContext = {
    name: req.trip.name,
    destination: req.trip.destination,
    startDate: req.trip.startDate,
    endDate: req.trip.endDate,
    purpose: req.trip.purpose,
    status: req.trip.status,
    itinerary: req.trip.itinerary.map((item) => ({
      title: item.title,
      type: item.type,
      date: item.date,
      time: item.time,
      location: item.location,
      notes: item.notes,
    })),
  };

  const systemPrompt = `${baseSystemPrompt}
Current trip context: ${JSON.stringify(tripContext)}`;

  if (!groq) {
    const response = "AI service is not configured. Please set GROQ_API_KEY in .env to enable chat.";
    await ChatMessage.create({
      tripId: req.trip._id,
      role: 'assistant',
      content: response,
    });
    return res.json({ success: true, response });
  }

  try {
    const history = await ChatMessage.find({ tripId: req.trip._id })
      .sort({ createdAt: 1 })
      .limit(20);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ];

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 600,
    });

    const response = completion.choices[0].message.content;
    await ChatMessage.create({
      tripId: req.trip._id,
      role: 'assistant',
      content: response,
    });
    res.json({ success: true, response });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'AI service unavailable' });
  }
});

app.listen(port, () => {
  console.log(`TravelChatter running on http://localhost:${port}`);
});
