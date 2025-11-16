import { useState } from 'react';
import './index.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const systemPrompt = `You are a hair loss expert and consultant for Hair Solutions Co., a premium hair replacement company. Your role is to:

1. Ask friendly, conversational questions to understand the customer's hair loss situation
2. Learn about their lifestyle, daily routine, and hair goals
3. Recommend appropriate hair systems from our product line
4. Explain the differences between base types (poly, lace, mono)
5. Guide them on density, color, and style choices
6. Address concerns about wearing, maintenance, and detection

Keep responses warm, professional, and reassuring. Ask one question at a time. Show empathy for their situation.`;

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Call our secure backend function instead of Anthropic directly
      const response = await fetch('/.netlify/functions/hair-consultation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          systemPrompt: systemPrompt,
          messages: updatedMessages
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      const assistantMessage = { role: 'assistant', content: data.reply };
      setMessages([...updatedMessages, assistantMessage]);

    } catch (error) {
      console.error('Error:', error);
      const errorMessage = { 
        role: 'assistant', 
        content: 'I apologize, but I encountered an error. Please try again.' 
      };
      setMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ textAlign: 'center', color: '#333' }}>
        Hair Solutions Consultation
      </h1>
      
      <div style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        height: '500px',
        overflowY: 'auto',
        padding: '20px',
        marginBottom: '20px',
        backgroundColor: '#f9f9f9'
      }}>
        {messages.length === 0 ? (
          <div style={{ color: '#666', textAlign: 'center', marginTop: '50px' }}>
            <p>👋 Welcome! I'm here to help you find the perfect hair system.</p>
            <p>Tell me a bit about yourself to get started!</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              style={{
                marginBottom: '15px',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: msg.role === 'user' ? '#007bff' : '#fff',
                color: msg.role === 'user' ? '#fff' : '#333',
                marginLeft: msg.role === 'user' ? '20%' : '0',
                marginRight: msg.role === 'user' ? '0' : '20%',
                border: msg.role === 'assistant' ? '1px solid #ddd' : 'none'
              }}
            >
              {msg.content}
            </div>
          ))
        )}
        {isLoading && (
          <div style={{ textAlign: 'center', color: '#666' }}>
            Typing...
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #ddd',
            fontSize: '16px',
            resize: 'vertical',
            minHeight: '60px'
          }}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: isLoading || !input.trim() ? '#ccc' : '#007bff',
            color: '#fff',
            fontSize: '16px',
            cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default App;
```

---

### 🔐 Step 3: Add Your API Key to Netlify (NOT in code!)

**Important:** Your API key should NEVER be in your code. Instead:

1. **Go to your Netlify dashboard**
2. **Select your site**
3. **Go to:** Site configuration → Environment variables
4. **Click:** Add a variable
5. **Add:**
   - **Key:** `ANTHROPIC_API_KEY`
   - **Value:** `your-actual-api-key-here`
   - **Scopes:** Check "Same value for all deploy contexts"
6. **Save**

---

### 📦 Step 4: Your Final Project Structure

Your project should now look like this:
```
hair-consultation-chatbot/
├── netlify/
│   └── functions/
│       └── hair-consultation.js   ← NEW (backend function)
├── src/
│   ├── App.jsx                     ← UPDATED (calls backend)
│   ├── main.jsx                    ← (no changes)
│   └── index.css                   ← (no changes)
├── index.html
├── package.json
├── vite.config.js
└── .gitignore