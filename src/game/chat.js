(function () {
  const CHANNELS = ["global", "order", "area", "trade"];
  const MESSAGE_LIMIT = 200;
  const messages = CHANNELS.reduce((acc, channel) => {
    acc[channel] = [];
    return acc;
  }, {});

  const tabButtons = {};
  const panels = {};
  let activeChannel = "global";
  let dockElement = null;

  function init() {
    dockElement = document.querySelector(".chat-dock");
    if (!dockElement) {
      return;
    }

    CHANNELS.forEach((channel) => {
      const tabId = `tab-${channel}`;
      const panelId = `chat-${channel}`;
      const tab = document.getElementById(tabId);
      const panel = document.getElementById(panelId);

      if (tab && panel) {
        tabButtons[channel] = tab;
        panels[channel] = panel;

        tab.addEventListener("click", () => switchChannel(channel));
      }
    });

    dockElement.addEventListener("pointerover", handleTooltipEnter, true);
    dockElement.addEventListener("pointerout", handleTooltipLeave, true);

    switchChannel(activeChannel);
  }

  function switchChannel(channel) {
    if (!panels[channel]) {
      console.warn(`Chat: missing panel for channel "${channel}"`);
      return;
    }

    CHANNELS.forEach((name) => {
      const tab = tabButtons[name];
      const panel = panels[name];
      if (!tab || !panel) {
        return;
      }

      const isActive = name === channel;
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
      panel.toggleAttribute("hidden", !isActive);
    });

    activeChannel = channel;
  }

  function handleTooltipEnter(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const itemId = target.dataset.item;
    if (!itemId) {
      return;
    }

    if (window.UI && typeof window.UI.showItemTooltip === "function") {
      window.UI.showItemTooltip(itemId, target);
    }
  }

  function handleTooltipLeave(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (!target.dataset.item) {
      return;
    }

    if (window.UI && typeof window.UI.hideItemTooltip === "function") {
      window.UI.hideItemTooltip(target);
    }
  }

  function addMessage(channel, username, text, timestamp) {
    const lowerChannel = (channel || "").toLowerCase();
    if (!messages[lowerChannel]) {
      console.warn(`Chat: unknown channel "${channel}"`);
      return;
    }

    const entry = {
      username: username || "Unknown",
      text: text || "",
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    };

    messages[lowerChannel].push(entry);
    if (messages[lowerChannel].length > MESSAGE_LIMIT) {
      messages[lowerChannel].shift();
      const panel = panels[lowerChannel];
      if (panel && panel.firstChild) {
        panel.removeChild(panel.firstChild);
      }
    }

    renderMessage(lowerChannel, entry);
  }

  function renderMessage(channel, entry) {
    const panel = panels[channel];
    if (!panel) {
      return;
    }

    const row = document.createElement("div");
    row.className = "chat-message";

    const timeSpan = document.createElement("span");
    timeSpan.className = "chat-message__time";
    timeSpan.textContent = formatTime(entry.timestamp);

    const nameSpan = document.createElement("span");
    nameSpan.className = "chat-message__user";
    nameSpan.textContent = entry.username;

    const textSpan = document.createElement("span");
    textSpan.className = "chat-message__text";
    textSpan.appendChild(parseMessageContent(entry.text));

    row.appendChild(timeSpan);
    row.appendChild(nameSpan);
    row.appendChild(textSpan);

    panel.appendChild(row);
    panel.scrollTop = panel.scrollHeight;
  }

  function parseMessageContent(text) {
    const fragment = document.createDocumentFragment();
    const source = String(text || "");
    const regex = /\[([a-z0-9_\-]+)\]/gi;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(source)) !== null) {
      if (match.index > lastIndex) {
        fragment.append(source.slice(lastIndex, match.index));
      }

      const span = document.createElement("span");
      span.className = "chat-item-link";
      span.dataset.item = match[1];
      span.textContent = match[1].replace(/_/g, " ");
      fragment.append(span);

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < source.length) {
      fragment.append(source.slice(lastIndex));
    }

    return fragment;
  }

  function formatTime(date) {
    const d = date instanceof Date ? date : new Date(date);
    const hours = `${d.getHours()}`.padStart(2, "0");
    const minutes = `${d.getMinutes()}`.padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  const Chat = {
    init,
    addMessage,
    getActiveChannel: () => activeChannel,
    getMessages: (channel) => {
      const lower = (channel || "").toLowerCase();
      return messages[lower] ? [...messages[lower]] : [];
    },
    switchChannel,
  };

  window.Chat = Chat;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
