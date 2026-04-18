document.addEventListener('DOMContentLoaded', () => {
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const chatMessages = document.getElementById('chat-messages');
    const stageSelect = document.getElementById('stage');
    const samplePrompts = document.querySelectorAll('.sample-prompts li');

    function addMessage(content, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
        messageDiv.textContent = content;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function sendMessage(message) {
        const stage = stageSelect.value;
        addMessage(message, true);

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message, stage }),
            });

            const data = await response.json();
            if (data.response) {
                addMessage(data.response);
            } else {
                addMessage('Sorry, I encountered an error. Please try again.');
            }
        } catch (error) {
            addMessage('Sorry, I\'m having trouble connecting. Please check your connection.');
        }
    }

    sendButton.addEventListener('click', () => {
        const message = messageInput.value.trim();
        if (message) {
            sendMessage(message);
            messageInput.value = '';
        }
    });

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendButton.click();
        }
    });

    samplePrompts.forEach(prompt => {
        prompt.addEventListener('click', () => {
            messageInput.value = prompt.textContent;
            sendButton.click();
        });
    });

    // Initial greeting
    addMessage('Hello! I\'m TravelChatter, your travel companion copilot. How can I help you with your business trip today?');
});