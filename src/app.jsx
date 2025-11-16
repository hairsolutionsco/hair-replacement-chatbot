import { useState } from 'react';
import './index.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // NEW: User information state
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [hasProvidedInfo, setHasProvidedInfo] = useState(false);

const systemPrompt = `You are a hair loss expert and consultant for Hair Solutions Co., a premium hair replacement company. Your role is to:

1. Ask friendly, conversational questions to understand the customer's hair loss situation
2. Learn about their lifestyle, daily routine, and hair goals
3. Recommend appropriate hair systems from our product line
4. Explain the differences between base types (poly, lace, mono)
5. Guide them on density, color, and style choices
6. Address concerns about wearing, maintenance, and detection

Keep responses warm, professional, and reassuring. Ask one question at a time. Show empathy for their situation.

MEETING SCHEDULING:
When customers show strong interest, need personalized help, or have complex questions, offer them a free consultation call:

"I'd be happy to connect you with our team for a personalized consultation. [Book a free 30-minute call here](https://meetings-eu1.hubspot.com/vlaroche/personal-consultation-call) and we can discuss your specific needs in detail."

Offer meetings when:
- Customer is confused or overwhelmed
- They have very specific customization needs
- They want to see product samples
- They're ready to buy but need final guidance
- They ask about speaking to someone directly

Don't push meetings too early - build rapport first. Natural timing is after 4-5 exchanges.`;

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/.netlify/functions/hair-consultation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          systemPrompt: systemPrompt,
          messages: updatedMessages,
          userEmail: userEmail,    // NEW: Send email
          userName: userName        // NEW: Send name
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
      
      {/* NEW: Email collection form */}
      {!hasProvidedInfo && (
        <div style={{
          padding: '20px',
          backgroundColor: '#f0f8ff',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #d0e8ff'
        }}>
          <h3 style={{ marginTop: 0 }}>Get Personalized Recommendations</h3>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Let's start with a bit about you so I can give you the best advice.
          </p>
          <input
            type="text"
            placeholder="Your name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '10px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              fontSize: '16px'
            }}
          />
          <input
            type="email"
            placeholder="Your email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '10px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              fontSize: '16px'
            }}
          />
          <button
            onClick={() => setHasProvidedInfo(true)}
            disabled={!userEmail || !userName}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: !userEmail || !userName ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: !userEmail || !userName ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            Start Consultation
          </button>
        </div>
      )}
      
      {/* Chat interface - only show after user provides info */}
      {hasProvidedInfo && (
        <>
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
                <p>👋 Welcome {userName}! I'm here to help you find the perfect hair system.</p>
                <p>Tell me a bit about your situation to get started!</p>
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
                  dangerouslySetInnerHTML={{
                    __html: msg.content.replace(
                      /\[([^\]]+)\]\(([^)]+)\)/g,
                      '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: ' + 
                      (msg.role === 'user' ? '#fff' : '#007bff') + 
                      '; text-decoration: underline; font-weight: bold;">$1</a>'
                    )
                  }}
                />
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
        </>
      )}
    </div>
  );
}

export default App;
```

---

## 🎯 What This Does

Now when Claude sends a message like:
```
"[Book a free 30-minute call here](https://meetings-eu1.hubspot.com/vlaroche/personal-consultation-call)"