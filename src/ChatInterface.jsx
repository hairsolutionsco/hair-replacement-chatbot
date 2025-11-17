import { useState, useEffect, useRef } from 'react';
import './index.css';

const API_URL = import.meta.env.VITE_API_URL || '';

function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [hasProvidedInfo, setHasProvidedInfo] = useState(false);
  const [sessionId, setSessionId] = useState('');

  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Generate session ID
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    setSessionId(newSessionId);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleStartChat = (e) => {
    e.preventDefault();
    if (userEmail.trim() && userName.trim()) {
      setHasProvidedInfo(true);
      setMessages([
        {
          role: 'assistant',
          content: `Hey ${userName}! 👋 I'm the Hair Solutions Mastermind - your personal expert for everything hair systems. I can help you with:\n\n✨ Finding the perfect hair system for you\n💇 Maintenance and styling advice\n📦 Tracking your orders\n🛠️ Troubleshooting any issues\n🎯 Full consultations from start to finish\n\nWhat can I help you with today?`,
        },
      ]);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    const updatedMessages = [
      ...messages,
      { role: 'user', content: userMessage },
    ];

    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          message: userMessage,
          userEmail,
          userName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      setMessages([
        ...updatedMessages,
        { role: 'assistant', content: data.reply },
      ]);
    } catch (error) {
      console.error('Error:', error);
      setMessages([
        ...updatedMessages,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Parse markdown links in message
  const parseLinks = (text) => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(
        <a
          key={match.index}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#2196F3',
            textDecoration: 'underline',
            fontWeight: '600',
          }}
        >
          {match[1]}
        </a>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  // Format message content with line breaks and links
  const formatMessage = (content) => {
    return content.split('\n').map((line, idx) => (
      <div key={idx} style={{ marginBottom: idx < content.split('\n').length - 1 ? '8px' : 0 }}>
        {parseLinks(line)}
      </div>
    ));
  };

  if (!hasProvidedInfo) {
    return (
      <div style={styles.container}>
        <div style={styles.infoCard}>
          <h1 style={styles.title}>Hair Solutions Mastermind</h1>
          <p style={styles.subtitle}>
            Your AI-powered hair system expert. Get personalized recommendations,
            maintenance advice, order tracking, and full consultations - all in one place.
          </p>
          <form onSubmit={handleStartChat} style={styles.form}>
            <input
              type="text"
              placeholder="Your Name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              style={styles.input}
              required
            />
            <input
              type="email"
              placeholder="Your Email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              style={styles.input}
              required
            />
            <button type="submit" style={styles.startButton}>
              Start Chat
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.chatContainer}>
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>Hair Solutions Mastermind</h1>
        <div style={styles.headerSubtitle}>
          Chatting as {userName} ({userEmail})
        </div>
      </div>

      <div style={styles.messagesContainer}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              ...styles.message,
              ...(msg.role === 'user' ? styles.userMessage : styles.assistantMessage),
            }}
          >
            {formatMessage(msg.content)}
          </div>
        ))}

        {isLoading && (
          <div style={{ ...styles.message, ...styles.assistantMessage }}>
            <em>Thinking...</em>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} style={styles.inputContainer}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(e);
            }
          }}
          placeholder="Type your message... (Press Enter to send)"
          style={styles.textarea}
          disabled={isLoading}
          rows={3}
        />
        <button
          type="submit"
          style={styles.sendButton}
          disabled={isLoading || !input.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  },
  infoCard: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    maxWidth: '500px',
    width: '100%',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '12px',
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '15px',
    color: '#666',
    marginBottom: '32px',
    textAlign: 'center',
    lineHeight: '1.6',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  input: {
    padding: '14px',
    fontSize: '16px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  startButton: {
    padding: '14px',
    fontSize: '16px',
    fontWeight: '600',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  chatContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    color: 'white',
    padding: '20px',
    textAlign: 'center',
  },
  headerTitle: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: '13px',
    opacity: 0.9,
    marginTop: '4px',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  message: {
    padding: '12px 16px',
    borderRadius: '12px',
    maxWidth: '80%',
    lineHeight: '1.5',
    fontSize: '15px',
    wordWrap: 'break-word',
  },
  userMessage: {
    backgroundColor: '#2196F3',
    color: 'white',
    alignSelf: 'flex-end',
    marginLeft: 'auto',
  },
  assistantMessage: {
    backgroundColor: 'white',
    color: '#333',
    alignSelf: 'flex-start',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  inputContainer: {
    padding: '20px',
    backgroundColor: 'white',
    borderTop: '1px solid #e0e0e0',
    display: 'flex',
    gap: '12px',
  },
  textarea: {
    flex: 1,
    padding: '12px',
    fontSize: '15px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    outline: 'none',
    resize: 'none',
    fontFamily: 'inherit',
  },
  sendButton: {
    padding: '12px 24px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
    transition: 'background-color 0.2s',
  },
};

export default ChatInterface;
