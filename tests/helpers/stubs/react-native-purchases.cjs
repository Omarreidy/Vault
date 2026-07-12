// RevenueCat stub — tests drive it via globalThis.__purchasesMock.
const Purchases = {
  async getCustomerInfo() {
    const mock = globalThis.__purchasesMock;
    if (!mock) throw new Error('purchases not stubbed');
    if (mock.error) throw mock.error;
    return mock.customerInfo;
  },
};

exports.__esModule = true;
exports.default = Purchases;
