// @supabase/supabase-js stub. Every client delegates to globalThis.__supabaseMock
// at call time, so each test can swap behavior. Unstubbed table calls return a
// benign chainable that resolves { data: null, error: null } for any chain.
function chainable(result = { data: null, error: null }) {
  const target = () => {};
  const proxy = new Proxy(target, {
    get(_t, prop) {
      if (prop === 'then') {
        return (resolve, reject) => Promise.resolve(result).then(resolve, reject);
      }
      return () => proxy;
    },
    apply() {
      return proxy;
    },
  });
  return proxy;
}

function resetSupabaseMock() {
  globalThis.__supabaseMock = {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
    },
    from: () => chainable(),
    rpc: async () => ({ data: null, error: null }),
  };
}
resetSupabaseMock();

function createClient() {
  const mock = () => globalThis.__supabaseMock;
  return {
    auth: {
      getUser: (...a) => mock().auth.getUser(...a),
      getSession: (...a) => mock().auth.getSession(...a),
      signInWithPassword: (...a) => mock().auth.signInWithPassword?.(...a),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    from: (...a) => mock().from(...a),
    rpc: (...a) => mock().rpc(...a),
    functions: { invoke: (...a) => mock().functions?.invoke?.(...a) },
  };
}

exports.__esModule = true;
exports.createClient = createClient;
exports.chainable = chainable;
exports.resetSupabaseMock = resetSupabaseMock;
