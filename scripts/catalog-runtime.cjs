// Plain Node uses the same server-only marker resolution as Next's server build.
const { registerHooks } = require("node:module");
registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(
      specifier === "server-only"
        ? "next/dist/compiled/server-only/empty.js"
        : specifier,
      context,
    );
  },
});
