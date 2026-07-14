// In-memory stand-in for expo-image-manipulator so scanDocument() runs under
// Node's test runner. Tests steer it through globalThis.__imageManipulatorMock:
//   { base64?: string }        — base64 returned by saveAsync (default 'aGVsbG8=')
//   { throwOnSave?: boolean }  — simulate a native decode/processing failure
const state = () => globalThis.__imageManipulatorMock ?? {};

module.exports = {
  ImageManipulator: {
    manipulate: () => ({
      resize() {},
      async renderAsync() {
        return {
          async saveAsync() {
            const s = state();
            if (s.throwOnSave) throw new Error('native image decode failed');
            return { base64: s.base64 ?? 'aGVsbG8=' };
          },
        };
      },
    }),
  },
  SaveFormat: { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' },
};
