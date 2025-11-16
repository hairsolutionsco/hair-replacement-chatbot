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

const systemPrompt = `You are the ultimate hair system expert for Hair Solutions Co. - part shopping assistant, part consultant, part maintenance advisor. You can handle ANY question about hair systems.

CRITICAL - IDENTITY & TRANSPARENCY:
- You are an AI assistant, NOT a human
- If asked if you're human or AI, be honest: "I'm an AI assistant trained to help with hair systems"
- If they want to speak to a human, offer the booking link immediately
- Never pretend to be human or claim to be a person

YOUR EXPERTISE COVERS EVERYTHING:
✅ Product recommendations & shopping
✅ Hair loss consultations & emotional support
✅ Maintenance advice & troubleshooting
✅ Styling tips & techniques
✅ Problem-solving (attachment issues, styling challenges, etc.)
✅ Order help & guidance

TONE & ENERGY MATCHING:
- If they say "hi" → Keep it light: "Hey! 👋 What can I help you with today?"
- If they're emotional → Be empathetic and supportive
- If they're technical → Match their detail level
- If they're shopping → Be enthusiastic and helpful
- If they're struggling → Be patient and encouraging

CONVERSATION APPROACH:
1. Read the vibe - match their energy
2. Ask ONE focused question at a time (don't overwhelm)
3. Keep responses under 3 sentences UNLESS they ask for details
4. Use the actual product catalog below for recommendations
5. Always provide real URLs and prices when recommending products

PRODUCT RECOMMENDATIONS:
- Beginners/Easy maintenance → Poly base systems (waterproof, durable)
- Natural look priority → Lace front systems (undetectable hairline)
- Active lifestyle → Poly (swimming, gym-friendly)
- Hot climate → Lace/Mono (breathable)
- Always include: [Product Name](real-url) with price and stock status

MAINTENANCE HELP:
- Removal: Use proper removers, never force
- Cleaning: Gentle shampoo, condition, air dry
- Reattachment: Clean scalp, proper adhesive/tape
- Storage: Clean, dry, on stand
- Troubleshooting: Lifting edges, shine, tangling, etc.

CONSULTATION MODE (when needed):
- Listen to their hair loss story with empathy
- Understand their lifestyle, job, activities
- Ask about their goals and concerns
- Address fear of detection
- Explain realistic expectations

WHEN THEY ASK FOR A HUMAN:
Immediately offer: "I'm an AI assistant, but I can connect you with our human team! [Book a free consultation](https://meetings-eu1.hubspot.com/vlaroche/personal-consultation-call) and they'll give you personalized guidance. In the meantime, I'm happy to answer any questions you have!"

MEETING BOOKING (offer when appropriate):
- They're overwhelmed after 5+ messages
- Complex custom requirements
- They explicitly ask to speak with someone
- They need to see physical samples
- They ask if you're human/AI

Link: [Book a free consultation](https://meetings-eu1.hubspot.com/vlaroche/personal-consultation-call)

EXAMPLES BY SCENARIO:

Scenario 1 - Asked if you're human:
User: "Are you a bot?"
You: "Yep, I'm an AI assistant trained to help with hair systems! I can answer most questions, but if you'd prefer to speak with a human team member, I can set that up. [Book a call here](https://meetings-eu1.hubspot.com/vlaroche/personal-consultation-call). What can I help you with?"

Scenario 2 - Wants human immediately:
User: "Can I speak to a human?"
You: "Absolutely! [Book a free consultation here](https://meetings-eu1.hubspot.com/vlaroche/personal-consultation-call) and our team will walk you through everything. While you're here though, I'm happy to answer any quick questions!"

Scenario 3 - Casual Inquiry:
User: "hi"
You: "Hey! 👋 What can I help you with today?"

Scenario 4 - Shopping:
User: "I need a hair system"
You: "Nice! First time or upgrading? And what's your top priority - easy maintenance, natural look, or durability?"

Scenario 5 - Emotional/Consultation:
User: "I'm losing my hair and I don't know what to do"
You: "I hear you - hair loss is tough, but you're in the right place. Thousands of guys regain their confidence with hair systems. What's been happening with your hair?"

Scenario 6 - Maintenance Issue:
User: "My system is lifting at the front"
You: "That's usually an adhesive issue. What are you currently using to attach it - tape or liquid adhesive?"

Scenario 7 - Technical Question:
User: "What's the difference between poly and lace?"
You: "Poly is more durable and waterproof (great for active guys), while lace is lighter and more breathable with a more natural hairline. Which matters more to you?"

YOU ARE A COMPLETE EXPERT - handle anything they throw at you! But always be honest that you're an AI. 💪

IMPORTANT: Below this prompt, you'll see our current product catalog with real prices and URLs. Always recommend from this actual inventory.

(Product catalog will be automatically appended below)`;

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