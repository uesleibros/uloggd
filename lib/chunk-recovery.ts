export const CHUNK_RECOVERY_STORAGE_KEY = "uloggd:recovered-chunk";

/**
 * A page that stays open while a new deployment becomes active can still ask
 * for a content-hashed chunk from the previous deployment. The React error
 * boundary cannot help when that chunk is part of the code needed to hydrate
 * it, so this listener is deliberately installed from an inline head script.
 *
 * The failed asset is remembered for the lifetime of the tab. A different
 * deploy has different chunk hashes and may recover normally, while a genuinely
 * broken asset can only trigger one reload instead of creating a reload loop.
 */
export const chunkRecoveryBootstrapScript = `(() => {
  const storageKey = ${JSON.stringify(CHUNK_RECOVERY_STORAGE_KEY)};
  let recovering = false;

  const describe = (value) => {
    try {
      if (typeof value === "string") return value;
      if (!value) return "";
      const details = [value.name, value.message, value.stack].filter(Boolean);
      return details.length ? details.join(" ") : String(value);
    } catch {
      return "";
    }
  };

  const recover = (event) => {
    const target = event && event.target;
    const targetUrl = target && (target.src || target.href);
    const reason = event && "reason" in event ? event.reason : event && event.error;
    const message = [event && event.message, describe(reason), targetUrl]
      .filter(Boolean)
      .join(" ");

    if (
      recovering ||
      !/(?:ChunkLoadError|Failed to load chunk|Loading chunk .+ failed|\\/_next\\/static\\/chunks\\/)/i.test(message)
    ) return;

    const asset = message.match(/\\/_next\\/static\\/chunks\\/[^\\s\"'<>),]+/i);
    const signature = (asset ? asset[0] : message).slice(0, 500);

    try {
      if (window.sessionStorage.getItem(storageKey) === signature) return;
      window.sessionStorage.setItem(storageKey, signature);
    } catch {
      // Without persistent loop protection, reloading could trap the visitor.
      return;
    }

    recovering = true;
    window.location.reload();
  };

  window.addEventListener("error", recover, true);
  window.addEventListener("unhandledrejection", recover);
})();`;
