// Minimal react-native surface used by the services under test.
const Platform = {
  get OS() {
    return globalThis.__platformOS ?? 'ios';
  },
  select(spec) {
    return spec[this.OS] ?? spec.default;
  },
};

const Share = {
  async share(content) {
    globalThis.__lastShare = content;
    return { action: 'sharedAction' };
  },
};

const AppState = {
  currentState: 'active',
  addEventListener() {
    return { remove() {} };
  },
};

const StyleSheet = {
  hairlineWidth: 1,
  create(styles) {
    return styles;
  },
  flatten(style) {
    return style;
  },
};

exports.__esModule = true;
exports.Platform = Platform;
exports.Share = Share;
exports.AppState = AppState;
exports.StyleSheet = StyleSheet;
exports.default = { Platform, Share, AppState, StyleSheet };
