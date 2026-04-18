# TravelChatter
A copilot that supports a business traveler through their trip.

## Project Overview
This project implements a Copilot-powered Travel Companion for business travelers, covering the entire journey from planning to post-trip follow-up.

## Architecture
- **Backend**: Node.js with Express
- **AI**: OpenAI GPT integration for conversational responses
- **Frontend**: Simple web interface for demo
- **Data**: Mock data for travel policies, approvals, etc.

## Traveler Journey Map
1. **Planning Phase**
   - User asks: "What do I need for my trip?"
   - Copilot: Provides checklist, policies, approval requirements

2. **Approval Phase**
   - Copilot detects need for approval
   - Prepares and submits request
   - Updates status and explains rejections

3. **During Travel**
   - Real-time assistance for delays, contacts
   - Provides options and escalation paths

4. **Issues Handling**
   - Detects problems, offers solutions
   - Reduces stress with clear summaries

5. **Post-Trip**
   - Reminds of follow-ups
   - Closes loops automatically

Escalation Points: When issues exceed policy limits or require human intervention.

## Setup
1. Install Node.js (if not installed): `winget install OpenJS.NodeJS`
2. Install dependencies: `npm install`
3. (Optional) Set up OpenAI API key: Copy `.env.example` to `.env` and add your key
4. Run the server: `npm start`
5. Open browser to http://localhost:3000

## Demo Mode
Without an OpenAI API key, the app runs in demo mode with pre-defined responses based on keywords.

## Prompt Set
1. "What do I need for my trip to London next week?"
   - Response: Checklist of documents, policies, approvals needed

2. "Do I need approval for this flight option?"
   - Response: Yes/No with explanation and auto-preparation

3. "What happens if I book a cheaper but non-refundable fare?"
   - Response: Tradeoffs explained: cost savings vs flexibility

4. "My flight was canceled — what should I do now?"
   - Response: Immediate options, rebooking help, covered expenses

5. "Who do I contact for help right now?"
   - Response: Escalation contacts based on situation

6. "What do I still need to do after this trip?"
   - Response: Expense submission, feedback, policy compliance

## Architecture + Privacy Summary
**Data Flow:**
- User input → Server → AI processing (if API key) or Mock responses → Sanitized output
- No persistent storage of personal data
- Conversations are stateless

**Guardrails:**
- Input validation and sanitization
- Rate limiting for API calls
- Error handling for service failures

**Key Assumptions:**
- Demo mode works without external APIs
- Policies are hardcoded for simplicity
- Real implementation would integrate with company systems

**Privacy:**
- No PII stored beyond session
- AI responses don't retain context between messages
- All data processing is local or through trusted APIs 
