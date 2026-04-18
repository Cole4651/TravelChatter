const express = require('express');
const bodyParser = require('body-parser');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const port = 3000;

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

// System prompt for the copilot
const systemPrompt = `
You are TravelChatter, an intelligent travel companion copilot for business travelers.
You help with planning, approvals, travel issues, and follow-up.
Always be helpful, clear, and respect privacy.
Current policies: ${JSON.stringify(travelPolicies)}
Stages: ${JSON.stringify(tripStages)}
`;

app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;
  const stage = req.body.stage || 'planning';

  // Mock responses for demo without API key
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
    // Use mock responses
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
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Stage: ${stage}. User: ${userMessage}` }
      ],
      max_tokens: 500
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