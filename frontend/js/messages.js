// ═══════════════════════════════════════════════════════════════════════════════
//  HomeRent Pro — Messages Page
// ═══════════════════════════════════════════════════════════════════════════════

let activeConversation = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }
  initNavbar();
  initTheme();
  initMobileMenu();
  updateNavAuth();
  loadConversations();

  const sendBtn = document.getElementById('sendMsgBtn');
  if (sendBtn) sendBtn.addEventListener('click', sendMsg);

  const input = document.getElementById('msgInput');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
    });
  }
});

async function loadConversations() {
  const container = document.getElementById('conversationsList');
  if (!container) return;

  try {
    const conversations = await apiGetConversations();

    if (conversations.length === 0) {
      container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)"><i class="fas fa-comment-slash" style="font-size:2rem;margin-bottom:12px;display:block"></i>No conversations yet</div>';
      return;
    }

    container.innerHTML = conversations.map(c => `
      <div class="msg-contact ${activeConversation === c.userId ? 'active' : ''}"
           onclick="openConversation('${c.userId}', '${c.userName}')">
        <div class="msg-contact-avatar">${getInitials(c.userName)}</div>
        <div class="msg-contact-info">
          <div class="msg-contact-name">${c.userName}</div>
          <div class="msg-contact-preview">${truncate(c.lastMessage.content, 30)}</div>
        </div>
        <div class="msg-contact-meta">
          <div class="msg-contact-time">${timeAgo(c.lastMessage.createdAt)}</div>
          ${c.unreadCount > 0 ? `<span class="msg-unread-badge">${c.unreadCount}</span>` : ''}
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading conversations:', err);
  }
}

async function openConversation(userId, userName) {
  activeConversation = userId;
  const chatArea = document.getElementById('chatArea');
  const chatHeader = document.getElementById('chatHeader');
  const chatBody = document.getElementById('chatBody');
  const chatInputArea = document.getElementById('chatInputArea');

  // Update sidebar active
  document.querySelectorAll('.msg-contact').forEach(c => c.classList.remove('active'));
  document.querySelector(`.msg-contact[onclick*="${userId}"]`)?.classList.add('active');

  chatHeader.innerHTML = `
    <div class="msg-contact-avatar" style="width:36px;height:36px;font-size:0.8rem">${getInitials(userName)}</div>
    <div>
      <div style="font-weight:600;font-size:0.95rem">${userName}</div>
    </div>
  `;
  chatHeader.style.display = 'flex';
  chatInputArea.style.display = 'flex';

  chatBody.innerHTML = '<div class="loading-overlay" style="padding:40px"><div class="spinner"></div></div>';

  try {
    const messages = await apiGetThread(userId);
    const currentUser = getUser();

    if (messages.length === 0) {
      chatBody.innerHTML = '<div class="msg-empty"><i class="fas fa-comment-dots"></i><p>No messages yet. Start the conversation!</p></div>';
      return;
    }

    chatBody.innerHTML = messages.map(m => `
      <div class="msg-bubble ${m.senderId === currentUser.id ? 'sent' : 'received'}">
        ${m.content}
        <div class="msg-bubble-time">${formatTime(m.createdAt)}</div>
      </div>
    `).join('');

    chatBody.scrollTop = chatBody.scrollHeight;
    loadConversations(); // Refresh unread counts
  } catch (err) {
    chatBody.innerHTML = '<div class="msg-empty"><i class="fas fa-exclamation-triangle"></i><p>Error loading messages</p></div>';
  }
}

async function sendMsg() {
  if (!activeConversation) return;
  const input = document.getElementById('msgInput');
  const content = input.value.trim();
  if (!content) return;

  input.value = '';

  try {
    await apiSendMessage({ receiverId: activeConversation, content });

    // Add bubble immediately
    const chatBody = document.getElementById('chatBody');
    const emptyState = chatBody.querySelector('.msg-empty');
    if (emptyState) emptyState.remove();

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble sent';
    bubble.innerHTML = `${content}<div class="msg-bubble-time">Just now</div>`;
    chatBody.appendChild(bubble);
    chatBody.scrollTop = chatBody.scrollHeight;

    loadConversations();
  } catch (err) {
    showToast('error', 'Error', err.message);
    input.value = content;
  }
}
