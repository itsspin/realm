(function (global) {
  const CHAT_HISTORY_LIMIT = 200;
  let chatHistory = [];
  let whisperTarget = null;
  let activeChatTab = 'all';
  let chatFocused = false;

  function sendChatMessage() {
    const chatInput = document.getElementById('chatInput');
    if (!chatInput) return;

    const message = chatInput.value.trim();
    if (!message) return;

    const player = global.State?.getPlayer();
    if (!player) return;

    // Parse command
    if (message.startsWith('/')) {
      handleChatCommand(message, player);
    } else {
      // Default to /say
      handleChatCommand(`/say ${message}`, player);
    }

    chatInput.value = '';
    chatInput.focus();
  }

  function handleChatCommand(command, player) {
    // Check debug commands first (if dev mode enabled)
    if (global.DebugCommands && global.DebugCommands.isEnabled() && 
        global.DebugCommands.handleCommand(command)) {
      return; // Debug command handled
    }

    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    switch (cmd) {
      case '/say':
        addChatMessage('say', player.name, args, player.id);
        break;
      case '/ooc':
        addChatMessage('ooc', player.name, args, player.id);
        break;
      case '/shout':
      case '/yell':
        addChatMessage('shout', player.name, args, player.id);
        break;
      case '/emote':
      case '/em':
        addChatMessage('emote', player.name, args, player.id);
        break;
      case '/tell':
      case '/t':
        const tellParts = args.split(' ');
        const targetName = tellParts[0];
        const tellMsg = tellParts.slice(1).join(' ');
        whisperTarget = targetName;
        addChatMessage('tell', player.name, tellMsg, player.id, targetName);
        break;
      case '/party':
      case '/p':
        if (player.party) {
          addChatMessage('party', player.name, args, player.id);
        } else {
          addSystemMessage('You are not in a party.');
        }
        break;
      case '/guild':
      case '/g':
        if (player.guild) {
          addChatMessage('guild', player.name, args, player.id);
        } else {
          addSystemMessage('You are not in a guild.');
        }
        break;
      case '/sit':
        if (global.HealthRegen) {
          const wasSitting = player.isSitting === true;
          if (global.HealthRegen.toggleSitting()) {
            addSystemMessage(wasSitting ? 'You stand up.' : 'You sit down to rest.');
          }
        } else {
          addSystemMessage('Sitting is not available.');
        }
        break;
      case '/meditate':
      case '/med':
        if (global.HealthRegen) {
          const wasSitting = player.isSitting === true;
          // Check if player uses mana
          const classData = global.REALM?.data?.classesEnhancedById?.[player.class?.toLowerCase()] ||
                           global.REALM?.data?.classesById?.[player.class?.toLowerCase()];
          const usesMana = classData?.resourceType === 'mana';
          
          if (global.HealthRegen.toggleSitting()) {
            if (wasSitting) {
              addSystemMessage('You stop meditating and stand up.');
            } else {
              if (usesMana) {
                addSystemMessage('You sit down and begin to meditate, focusing your mind to restore mana.');
              } else {
                addSystemMessage('You sit down to rest.');
              }
            }
          }
        } else {
          addSystemMessage('Meditation is not available.');
        }
        break;
      case '/stand':
        if (global.HealthRegen && player.isSitting) {
          if (global.HealthRegen.setSitting(false)) {
            addSystemMessage('You stand up.');
          }
        } else {
          addSystemMessage('You are already standing.');
        }
        break;
      case '/give':
        handleGiveCommand(args, player);
        break;
      default:
        addSystemMessage(`Unknown command: ${cmd}. Use /say, /ooc, /shout, /yell, /emote, /tell [name], /party, /guild, /sit, /meditate, /stand, /give [item] [npc]`);
    }
  }

  /**
   * Handle GIVE command: /give [item] [npc]
   */
  function handleGiveCommand(args, player) {
    const parts = args.trim().split(/\s+/);
    if (parts.length < 2) {
      addSystemMessage('Usage: /give [item] [npc]. Example: /give goblin_ear guard_captain');
      return;
    }

    const itemId = parts[0];
    const npcName = parts.slice(1).join(' ');

    // Find NPC by name (check nearby NPCs first)
    const currentTarget = global.Targeting?.getTarget();
    let npc = null;
    let npcId = null;

    // Check if current target is an NPC
    if (currentTarget && (currentTarget.type === 'npc' || currentTarget.mobTemplate?.isGuard)) {
      npcId = currentTarget.id;
      npc = global.REALM?.data?.npcsById?.[npcId];
    }

    // If not, search by name
    if (!npc) {
      const npcs = Object.values(global.REALM?.data?.npcsById || {});
      npc = npcs.find(n => n.name.toLowerCase() === npcName.toLowerCase());
      if (npc) npcId = npc.id;
    }

    if (!npc || !npcId) {
      addSystemMessage(`NPC "${npcName}" not found. Target an NPC first or use the full NPC name.`);
      return;
    }

    // Check if player has the item
    const inventoryItem = (player.inventory || []).find(inv => inv.itemId === itemId);
    if (!inventoryItem) {
      addSystemMessage(`You don't have ${itemId.replace(/_/g, ' ')} in your inventory.`);
      return;
    }

    // Try to turn in quest item
    if (global.Quests?.turnInQuestItem(npcId, itemId)) {
      addSystemMessage(`You give ${itemId.replace(/_/g, ' ')} to ${npc.name}.`);
      return;
    }

    // Not a quest item, just give it to NPC (for future trading/quest systems)
    addSystemMessage(`${npc.name} doesn't need this item for any quest.`);
  }

  function addChatMessage(type, senderName, message, senderId, targetName = null) {
    const entry = {
      type,
      sender: senderName,
      senderId,
      message,
      target: targetName,
      timestamp: Date.now()
    };

    chatHistory.push(entry);
    if (chatHistory.length > CHAT_HISTORY_LIMIT) {
      chatHistory.shift();
    }

    saveChatHistory();
    renderChat();

    // In multiplayer, broadcast to server
    // For now, simulate zone chat
    if (type === 'say' || type === 'ooc' || type === 'shout') {
      // Zone-wide message
      global.Narrative?.addEntry({
        type: 'chat',
        text: formatChatMessage(entry),
        meta: ''
      });
    }
  }

  function addSystemMessage(message) {
    const entry = {
      type: 'system',
      sender: 'System',
      message,
      timestamp: Date.now()
    };

    chatHistory.push(entry);
    if (chatHistory.length > CHAT_HISTORY_LIMIT) {
      chatHistory.shift();
    }

    saveChatHistory();
    renderChat();
  }

  function formatChatMessage(entry) {
    const time = new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    switch (entry.type) {
      case 'say':
        return `[${time}] ${entry.sender} says: ${entry.message}`;
      case 'ooc':
        return `[${time}] ${entry.sender} (( ${entry.message} ))`;
      case 'shout':
        return `[${time}] ${entry.sender} SHOUTS: ${entry.message.toUpperCase()}`;
      case 'emote':
        return `[${time}] ${entry.sender} ${entry.message}`;
      case 'tell':
        return `[${time}] ${entry.sender} tells ${entry.target}: ${entry.message}`;
      case 'party':
        return `[${time}] [Party] ${entry.sender}: ${entry.message}`;
      case 'guild':
        return `[${time}] [Guild] ${entry.sender}: ${entry.message}`;
      case 'system':
        return `[${time}] ${entry.message}`;
      default:
        return `[${time}] ${entry.sender}: ${entry.message}`;
    }
  }

  function initChat() {
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    
    if (chatInput) {
      // Focus chat on Enter key (when not already focused)
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          // Don't focus if already typing
          if (!chatFocused && chatInput) {
            e.preventDefault();
            chatInput.focus();
            chatFocused = true;
            return;
          }
        }
      });

      // Send message on Enter (when chat is focused)
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendChatMessage();
          chatFocused = false;
          chatInput.blur();
        }
      });

      // Track focus state
      chatInput.addEventListener('focus', () => {
        chatFocused = true;
      });

      chatInput.addEventListener('blur', () => {
        chatFocused = false;
      });
    }

    if (chatSendBtn) {
      chatSendBtn.addEventListener('click', sendChatMessage);
    }

    // Setup chat tabs
    const chatTabs = document.querySelectorAll('.chat-tab');
    chatTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        activeChatTab = tab.dataset.tab;
        chatTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderChat();
      });
    });

    // Load chat history from localStorage
    const saved = localStorage.getItem('REALM_CHAT_HISTORY');
    if (saved) {
      try {
        chatHistory = JSON.parse(saved).slice(-CHAT_HISTORY_LIMIT);
        renderChat();
      } catch (e) {
        chatHistory = [];
      }
    }
  }

  function renderChat() {
    const chatContainer = document.getElementById('chatMessages');
    if (!chatContainer) return;

    // Filter messages based on active tab
    let filteredHistory = chatHistory;
    if (activeChatTab !== 'all') {
      filteredHistory = chatHistory.filter(entry => {
        if (activeChatTab === 'say') return entry.type === 'say';
        if (activeChatTab === 'local') return entry.type === 'say' || entry.type === 'ooc' || entry.type === 'shout';
        if (activeChatTab === 'system') return entry.type === 'system';
        if (activeChatTab === 'combat') return entry.type === 'combat';
        return true;
      });
    }

    const html = filteredHistory.slice(-50).map(entry => {
      const formatted = formatChatMessage(entry);
      const typeClass = `chat-message--${entry.type}`;
      return `<div class="chat-message ${typeClass}">${formatted}</div>`;
    }).join('');

    chatContainer.innerHTML = html;
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  function saveChatHistory() {
    try {
      localStorage.setItem('REALM_CHAT_HISTORY', JSON.stringify(chatHistory.slice(-100)));
    } catch (e) {
      console.error('Failed to save chat history:', e);
    }
  }

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChat);
  } else {
    setTimeout(initChat, 100);
  }

  const ChatSystem = {
    addChatMessage,
    addSystemMessage,
    renderChat
  };

  global.ChatSystem = ChatSystem;
})(window);


