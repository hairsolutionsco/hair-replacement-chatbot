import { useState, useEffect } from 'react';
import { BarChart3, Users, MessageSquare, Ticket, TrendingUp, Eye } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Dashboard data
  const [stats, setStats] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (authenticated) {
      loadDashboardData();
    }
  }, [authenticated, activeTab]);

  const checkAuth = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/check`, {
        credentials: 'include',
      });
      const data = await response.json();
      setAuthenticated(data.authenticated);
    } catch (err) {
      console.error('Auth check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setAuthenticated(true);
        setPassword('');
      } else {
        setError('Invalid password');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/admin/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      setAuthenticated(false);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const loadDashboardData = async () => {
    try {
      if (activeTab === 'overview') {
        const response = await fetch(`${API_URL}/api/admin/stats`, {
          credentials: 'include',
        });
        const data = await response.json();
        setStats(data.stats);
      } else if (activeTab === 'conversations') {
        const response = await fetch(`${API_URL}/api/admin/conversations?limit=50`, {
          credentials: 'include',
        });
        const data = await response.json();
        setConversations(data.conversations);
      } else if (activeTab === 'customers') {
        const response = await fetch(`${API_URL}/api/admin/customers?limit=50`, {
          credentials: 'include',
        });
        const data = await response.json();
        setCustomers(data.customers);
      } else if (activeTab === 'tickets') {
        const response = await fetch(`${API_URL}/api/admin/tickets`, {
          credentials: 'include',
        });
        const data = await response.json();
        setTickets(data.tickets);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  const viewConversation = async (conversationId) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/conversations/${conversationId}`, {
        credentials: 'include',
      });
      const data = await response.json();
      setSelectedConversation(data);
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  };

  const viewCustomer = async (customerId) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/customers/${customerId}`, {
        credentials: 'include',
      });
      const data = await response.json();
      setSelectedCustomer(data);
    } catch (err) {
      console.error('Failed to load customer:', err);
    }
  };

  // Login screen
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingText}>Loading...</div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div style={styles.container}>
        <div style={styles.loginCard}>
          <h1 style={styles.loginTitle}>Hair Solutions Admin</h1>
          <form onSubmit={handleLogin} style={styles.loginForm}>
            <input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.passwordInput}
              autoFocus
            />
            {error && <div style={styles.error}>{error}</div>}
            <button type="submit" style={styles.loginButton}>
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div style={styles.dashboard}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.dashboardTitle}>Hair Solutions Mastermind - Admin Dashboard</h1>
        <button onClick={handleLogout} style={styles.logoutButton}>
          Logout
        </button>
      </div>

      {/* Navigation */}
      <div style={styles.nav}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            ...styles.navButton,
            ...(activeTab === 'overview' ? styles.navButtonActive : {}),
          }}
        >
          <BarChart3 size={18} style={styles.navIcon} />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('conversations')}
          style={{
            ...styles.navButton,
            ...(activeTab === 'conversations' ? styles.navButtonActive : {}),
          }}
        >
          <MessageSquare size={18} style={styles.navIcon} />
          Conversations
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          style={{
            ...styles.navButton,
            ...(activeTab === 'customers' ? styles.navButtonActive : {}),
          }}
        >
          <Users size={18} style={styles.navIcon} />
          Customers
        </button>
        <button
          onClick={() => setActiveTab('tickets')}
          style={{
            ...styles.navButton,
            ...(activeTab === 'tickets' ? styles.navButtonActive : {}),
          }}
        >
          <Ticket size={18} style={styles.navIcon} />
          Support Tickets
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div style={styles.overviewGrid}>
            <StatCard
              title="Total Customers"
              value={stats.total_customers}
              subtitle={`+${stats.new_customers_week} this week`}
              icon={<Users size={24} />}
              color="#4CAF50"
            />
            <StatCard
              title="Total Conversations"
              value={stats.total_conversations}
              subtitle={`${stats.active_conversations} active`}
              icon={<MessageSquare size={24} />}
              color="#2196F3"
            />
            <StatCard
              title="Total Messages"
              value={stats.total_messages}
              icon={<TrendingUp size={24} />}
              color="#FF9800"
            />
            <StatCard
              title="Support Tickets"
              value={stats.total_tickets}
              subtitle={`${stats.open_tickets} open`}
              icon={<Ticket size={24} />}
              color="#F44336"
            />
          </div>
        )}

        {/* Conversations Tab */}
        {activeTab === 'conversations' && !selectedConversation && (
          <div style={styles.tableContainer}>
            <h2 style={styles.tableTitle}>Recent Conversations</h2>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Customer</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Started</th>
                  <th style={styles.th}>Messages</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {conversations.map((conv) => (
                  <tr key={conv.id} style={styles.tr}>
                    <td style={styles.td}>{conv.customer_name || 'Anonymous'}</td>
                    <td style={styles.td}>{conv.customer_email}</td>
                    <td style={styles.td}>{new Date(conv.started_at).toLocaleString()}</td>
                    <td style={styles.td}>{conv.message_count}</td>
                    <td style={styles.td}>
                      <span style={getStatusBadgeStyle(conv.status)}>{conv.status}</span>
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() => viewConversation(conv.id)}
                        style={styles.viewButton}
                      >
                        <Eye size={16} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Conversation Detail */}
        {selectedConversation && (
          <div style={styles.detailView}>
            <button
              onClick={() => setSelectedConversation(null)}
              style={styles.backButton}
            >
              ← Back to Conversations
            </button>
            <h2 style={styles.detailTitle}>
              Conversation with {selectedConversation.conversation.customer_name}
            </h2>
            <div style={styles.conversationMeta}>
              <p><strong>Email:</strong> {selectedConversation.conversation.customer_email}</p>
              <p><strong>Started:</strong> {new Date(selectedConversation.conversation.started_at).toLocaleString()}</p>
              <p><strong>Status:</strong> {selectedConversation.conversation.status}</p>
            </div>
            <div style={styles.messagesContainer}>
              {selectedConversation.messages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    ...styles.message,
                    ...(msg.role === 'user' ? styles.userMessage : styles.assistantMessage),
                  }}
                >
                  <div style={styles.messageRole}>{msg.role}</div>
                  <div style={styles.messageContent}>{msg.content}</div>
                  <div style={styles.messageTime}>
                    {new Date(msg.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && !selectedCustomer && (
          <div style={styles.tableContainer}>
            <h2 style={styles.tableTitle}>Customers</h2>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Conversations</th>
                  <th style={styles.th}>Memories</th>
                  <th style={styles.th}>Last Interaction</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} style={styles.tr}>
                    <td style={styles.td}>{customer.name || 'N/A'}</td>
                    <td style={styles.td}>{customer.email}</td>
                    <td style={styles.td}>{customer.conversation_count}</td>
                    <td style={styles.td}>{customer.memory_count}</td>
                    <td style={styles.td}>
                      {customer.last_interaction
                        ? new Date(customer.last_interaction).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() => viewCustomer(customer.id)}
                        style={styles.viewButton}
                      >
                        <Eye size={16} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Customer Detail */}
        {selectedCustomer && (
          <div style={styles.detailView}>
            <button
              onClick={() => setSelectedCustomer(null)}
              style={styles.backButton}
            >
              ← Back to Customers
            </button>
            <h2 style={styles.detailTitle}>
              {selectedCustomer.customer.name || 'Anonymous Customer'}
            </h2>
            <div style={styles.customerInfo}>
              <p><strong>Email:</strong> {selectedCustomer.customer.email}</p>
              <p><strong>Phone:</strong> {selectedCustomer.customer.phone || 'N/A'}</p>
              <p><strong>Status:</strong> {selectedCustomer.customer.customer_status}</p>
              <p><strong>Joined:</strong> {new Date(selectedCustomer.customer.created_at).toLocaleDateString()}</p>
            </div>

            <h3 style={styles.sectionTitle}>Memory & Insights</h3>
            <div style={styles.memoriesContainer}>
              {selectedCustomer.memories.length === 0 ? (
                <p>No memories stored yet.</p>
              ) : (
                selectedCustomer.memories.map((memory) => (
                  <div key={memory.id} style={styles.memoryCard}>
                    <div style={styles.memoryType}>{memory.memory_type}</div>
                    <div style={styles.memoryKey}>{memory.key}</div>
                    <div style={styles.memoryValue}>{memory.value}</div>
                    <div style={styles.memoryMeta}>
                      Confidence: {(memory.confidence * 100).toFixed(0)}% | Source: {memory.source}
                    </div>
                  </div>
                ))
              )}
            </div>

            <h3 style={styles.sectionTitle}>Recent Conversations</h3>
            <div style={styles.conversationList}>
              {selectedCustomer.conversations.map((conv) => (
                <div key={conv.id} style={styles.conversationItem}>
                  <div>{new Date(conv.started_at).toLocaleString()}</div>
                  <div>{conv.message_count} messages</div>
                  <div style={getStatusBadgeStyle(conv.status)}>{conv.status}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tickets Tab */}
        {activeTab === 'tickets' && (
          <div style={styles.tableContainer}>
            <h2 style={styles.tableTitle}>Support Tickets</h2>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Customer</th>
                  <th style={styles.th}>Subject</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Created</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id} style={styles.tr}>
                    <td style={styles.td}>#{ticket.id}</td>
                    <td style={styles.td}>{ticket.customer_name}</td>
                    <td style={styles.td}>{ticket.subject}</td>
                    <td style={styles.td}>{ticket.ticket_type}</td>
                    <td style={styles.td}>
                      <span style={getStatusBadgeStyle(ticket.status)}>{ticket.status}</span>
                    </td>
                    <td style={styles.td}>{new Date(ticket.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, subtitle, icon, color }) {
  return (
    <div style={styles.statCard}>
      <div style={{ ...styles.statIcon, backgroundColor: color }}>{icon}</div>
      <div style={styles.statContent}>
        <div style={styles.statTitle}>{title}</div>
        <div style={styles.statValue}>{value}</div>
        {subtitle && <div style={styles.statSubtitle}>{subtitle}</div>}
      </div>
    </div>
  );
}

// Helper function for status badges
function getStatusBadgeStyle(status) {
  const baseStyle = {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
  };

  switch (status) {
    case 'active':
    case 'open':
      return { ...baseStyle, backgroundColor: '#4CAF50', color: 'white' };
    case 'completed':
    case 'resolved':
      return { ...baseStyle, backgroundColor: '#2196F3', color: 'white' };
    case 'escalated':
    case 'urgent':
      return { ...baseStyle, backgroundColor: '#F44336', color: 'white' };
    default:
      return { ...baseStyle, backgroundColor: '#9E9E9E', color: 'white' };
  }
}

// Styles
const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: '18px',
    color: '#666',
  },
  loginCard: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    maxWidth: '400px',
    width: '100%',
  },
  loginTitle: {
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '24px',
    textAlign: 'center',
    color: '#333',
  },
  loginForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  passwordInput: {
    padding: '12px',
    fontSize: '16px',
    border: '2px solid #ddd',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  loginButton: {
    padding: '12px',
    fontSize: '16px',
    fontWeight: '600',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  error: {
    color: '#F44336',
    fontSize: '14px',
    textAlign: 'center',
  },
  dashboard: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: '20px 40px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dashboardTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#333',
    margin: 0,
  },
  logoutButton: {
    padding: '8px 20px',
    backgroundColor: '#F44336',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  nav: {
    backgroundColor: 'white',
    padding: '0 40px',
    display: 'flex',
    gap: '8px',
    borderBottom: '1px solid #e0e0e0',
  },
  navButton: {
    padding: '16px 24px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
    color: '#666',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s',
  },
  navButtonActive: {
    color: '#2196F3',
    borderBottomColor: '#2196F3',
  },
  navIcon: {
    display: 'inline-block',
  },
  content: {
    padding: '40px',
  },
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '24px',
  },
  statCard: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  statIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
  },
  statContent: {
    flex: 1,
  },
  statTitle: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '4px',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#333',
  },
  statSubtitle: {
    fontSize: '12px',
    color: '#999',
    marginTop: '4px',
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  tableTitle: {
    fontSize: '20px',
    fontWeight: '700',
    marginBottom: '20px',
    color: '#333',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px',
    borderBottom: '2px solid #e0e0e0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#666',
  },
  tr: {
    borderBottom: '1px solid #f0f0f0',
  },
  td: {
    padding: '12px',
    fontSize: '14px',
    color: '#333',
  },
  viewButton: {
    padding: '6px 12px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  detailView: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  backButton: {
    padding: '8px 16px',
    backgroundColor: '#e0e0e0',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    marginBottom: '20px',
  },
  detailTitle: {
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '16px',
    color: '#333',
  },
  conversationMeta: {
    backgroundColor: '#f5f5f5',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  messagesContainer: {
    maxHeight: '600px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  message: {
    padding: '12px 16px',
    borderRadius: '8px',
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: '#E3F2FD',
    alignSelf: 'flex-end',
    marginLeft: 'auto',
  },
  assistantMessage: {
    backgroundColor: '#F5F5F5',
    alignSelf: 'flex-start',
  },
  messageRole: {
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    color: '#666',
    marginBottom: '4px',
  },
  messageContent: {
    fontSize: '14px',
    lineHeight: '1.5',
    color: '#333',
  },
  messageTime: {
    fontSize: '11px',
    color: '#999',
    marginTop: '6px',
  },
  customerInfo: {
    backgroundColor: '#f5f5f5',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    marginTop: '24px',
    marginBottom: '16px',
    color: '#333',
  },
  memoriesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  memoryCard: {
    backgroundColor: '#f9f9f9',
    padding: '12px',
    borderRadius: '8px',
    borderLeft: '4px solid #2196F3',
  },
  memoryType: {
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    color: '#666',
    marginBottom: '4px',
  },
  memoryKey: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '4px',
  },
  memoryValue: {
    fontSize: '14px',
    color: '#555',
    marginBottom: '8px',
  },
  memoryMeta: {
    fontSize: '11px',
    color: '#999',
  },
  conversationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  conversationItem: {
    backgroundColor: '#f9f9f9',
    padding: '12px',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
  },
};

export default AdminDashboard;
