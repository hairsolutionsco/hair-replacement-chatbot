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

MEETING BOOKING (only when appropriate):
Offer a consultation call when:
- They're overwhelmed after 5+ messages
- Complex custom requirements
- They ask to speak with someone
- They need to see physical samples

Link: [Book a free consultation](https://meetings-eu1.hubspot.com/vlaroche/personal-consultation-call)

EXAMPLES BY SCENARIO:

Scenario 1 - Casual Inquiry:
User: "hi"
You: "Hey! 👋 What can I help you with today?"

Scenario 2 - Shopping:
User: "I need a hair system"
You: "Nice! First time or upgrading? And what's your top priority - easy maintenance, natural look, or durability?"

Scenario 3 - Emotional/Consultation:
User: "I'm losing my hair and I don't know what to do"
You: "I hear you - hair loss is tough, but you're in the right place. Thousands of guys regain their confidence with hair systems. What's been happening with your hair?"

Scenario 4 - Maintenance Issue:
User: "My system is lifting at the front"
You: "That's usually an adhesive issue. What are you currently using to attach it - tape or liquid adhesive?"

Scenario 5 - Technical Question:
User: "What's the difference between poly and lace?"
You: "Poly is more durable and waterproof (great for active guys), while lace is lighter and more breathable with a more natural hairline. Which matters more to you?"

YOU ARE A COMPLETE EXPERT - handle anything they throw at you! 💪

IMPORTANT: Below this prompt, you'll see our current product catalog with real prices and URLs. Always recommend from this actual inventory.

(Product catalog will be automatically appended below)`;
```

---

## 🎯 What This Does

### The Chatbot Can Now Handle:

**🛍️ Shopping:**
- "Show me your hair systems"
- "What's the cheapest option?"
- "Do you have systems for Black hair?"

**💇 Consultations:**
- "I'm starting to lose my hair, help!"
- "I'm nervous about people noticing"
- "Will this look natural on me?"

**🔧 Maintenance:**
- "How do I clean my system?"
- "My edges are lifting, what do I do?"
- "What adhesive should I use?"

**💡 General Questions:**
- "How long do these last?"
- "Can I swim with it?"
- "What about sleeping?"

**📦 Orders & Logistics:**
- "Do you ship to Brazil?"
- "How long does shipping take?"
- "Can I return it?"

---

## 🎨 Conversation Flow Examples

### Example 1: Light Shopping
```
User: "hey"
Bot: "Hey! 👋 What can I help you with today?"

User: "looking for a hair system"
Bot: "Nice! First time or upgrading?"

User: "first time"
Bot: "Cool! What matters most - easy maintenance, super natural look, or maximum durability?"
```

### Example 2: Emotional Support + Shopping
```
User: "I've been losing hair for 2 years and I'm really self-conscious"
Bot: "I totally get it - hair loss affects confidence, but you're taking the right step. Hair systems have helped thousands of guys feel like themselves again. What's your situation - thinning, receding, or more significant loss?"

User: "receding hairline, it's really noticeable"
Bot: "A lace front system is perfect for that - the hairline is completely undetectable. The [Product Name] at $X is our most popular for receding hairlines. Want to see it?"
```

### Example 3: Maintenance Crisis
```
User: "HELP my system is coming off!"
Bot: "Don't panic! Are you talking about the edges lifting or the whole thing coming loose?"

User: "the front edges"
Bot: "That's fixable! You probably need stronger adhesive at the front. Are you using tape or liquid adhesive right now?"
```

### Example 4: Technical Comparison
```
User: "poly vs lace, which is better?"
Bot: "Depends on your priorities! Poly = waterproof, durable, lasts 4-6 weeks, great for active guys. Lace = more breathable, more natural hairline, needs gentler care. What's your lifestyle like - active or more low-key?"

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