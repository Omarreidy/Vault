// In-memory AsyncStorage stub. Tests reset/inspect via globalThis.__asyncStore.
const store = new Map();
globalThis.__asyncStore = store;

const AsyncStorage = {
  async getItem(key) {
    return store.has(key) ? store.get(key) : null;
  },
  async setItem(key, value) {
    store.set(key, String(value));
  },
  async removeItem(key) {
    store.delete(key);
  },
  async clear() {
    store.clear();
  },
  async getAllKeys() {
    return [...store.keys()];
  },
};

exports.__esModule = true;
exports.default = AsyncStorage;
