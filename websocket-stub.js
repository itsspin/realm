// Fake PubSub API for future WebSocket integration
export const ws = {
  _handlers: {},

  /**
   * Register a handler for a given channel.
   * @param {string} channel
   * @param {(msg: any) => void} fn
   */
  on(channel, fn) {
    if (!this._handlers[channel]) this._handlers[channel] = [];
    this._handlers[channel].push(fn);
  },

  /**
   * Send a message on a channel.
   * For now, immediately invokes local handlers.
   * @param {string} channel
   * @param {any} msg
   */
  send(channel, msg) {
    const list = this._handlers[channel] || [];
    for (const fn of list) {
      fn(msg);
    }
  }
};
