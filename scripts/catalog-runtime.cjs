// CLI callers pass --conditions=react-server. Use React's official conditional
// marker rather than mixing custom synchronous Node hooks with tsx's loader.
require("server-only");
// CLI callers finish optional population before closing their shared clients.
globalThis.uloggdCatalogueCli = true;
