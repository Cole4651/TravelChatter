document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    fetch('/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
            if (!data.success) {
                localStorage.removeItem('authToken');
                window.location.href = 'login.html';
                return;
            }
            document.getElementById('auth-status').textContent = data.email;
        });

    document.getElementById('logout-button').addEventListener('click', () => {
        localStorage.removeItem('authToken');
        window.location.href = 'login.html';
    });

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
            const res = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ message, stage })
            });
            const data = await res.json();
            addMessage(data.response || 'Sorry, I encountered an error. Please try again.');
        } catch {
            addMessage("Sorry, I'm having trouble connecting. Please check your connection.");
        }
    }

    sendButton.addEventListener('click', () => {
        const message = messageInput.value.trim();
        if (message) {
            sendMessage(message);
            messageInput.value = '';
        }
    });

    messageInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') sendButton.click();
    });

    samplePrompts.forEach(prompt => {
        prompt.addEventListener('click', () => {
            messageInput.value = prompt.textContent.replace(/"/g, '');
            sendButton.click();
        });
    });

    addMessage("Hello! I'm TravelChatter, your travel companion copilot. How can I help you today?");
});
