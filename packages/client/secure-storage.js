/** Adapter for Expo SecureStore. Chunking keeps each native value below 2 KB. */
export function createSecureSessionStorage({
  getItemAsync,
  setItemAsync,
  deleteItemAsync,
  createRevision,
}) {
  const locks = new Map();
  const base = (key) => {
    if (typeof key !== "string" || !/^[a-zA-Z0-9._-]{1,180}$/.test(key))
      throw new Error("Ongeldige veilige opslagsleutel.");
    return "haagv." + key;
  };
  const lock = (key, fn) => {
    const next = (locks.get(key) || Promise.resolve()).then(fn);
    locks.set(
      key,
      next.catch(() => {}),
    );
    return next;
  };
  async function manifest(key) {
    const raw = await getItemAsync(base(key));
    if (!raw) return null;
    try {
      const m = JSON.parse(raw);
      return typeof m.revision === "string" &&
        /^[a-zA-Z0-9-]{1,80}$/.test(m.revision) &&
        Number.isInteger(m.chunks) &&
        m.chunks > 0 &&
        m.chunks <= 128
        ? m
        : null;
    } catch {
      return null;
    }
  }
  const chunk = (key, m, i) => `${base(key)}.${m.revision}.${i}`;
  async function clean(key, m) {
    if (m)
      await Promise.all(
        Array.from({ length: m.chunks }, (_, i) =>
          deleteItemAsync(chunk(key, m, i)).catch(() => {}),
        ),
      );
  }
  return {
    getItem: (key) =>
      lock(key, async () => {
        const m = await manifest(key);
        if (!m) return null;
        const values = await Promise.all(
          Array.from({ length: m.chunks }, (_, i) =>
            getItemAsync(chunk(key, m, i)),
          ),
        );
        return values.some((value) => value === null) ? null : values.join("");
      }),
    setItem: (key, value) =>
      lock(key, async () => {
        if (typeof value !== "string" || value.length > 128000)
          throw new Error("De sessie is te groot voor veilige apparaatopslag.");
        const values = [""];
        let bytes = 0;
        for (const char of value) {
          const cp = char.codePointAt(0),
            size = cp <= 0x7f ? 1 : cp <= 0x7ff ? 2 : cp <= 0xffff ? 3 : 4;
          if (bytes + size > 1400) {
            values.push("");
            bytes = 0;
          }
          values[values.length - 1] += char;
          bytes += size;
        }
        if (values.length > 128)
          throw new Error("De sessie is te groot voor veilige apparaatopslag.");
        const previous = await manifest(key),
          next = { revision: createRevision(), chunks: values.length };
        if (
          !/^[a-zA-Z0-9-]{1,80}$/.test(next.revision) ||
          previous?.revision === next.revision
        )
          throw new Error("Ongeldige opslagrevisie.");
        try {
          for (let i = 0; i < next.chunks; i++)
            await setItemAsync(chunk(key, next, i), values[i]);
          await setItemAsync(base(key), JSON.stringify(next));
        } catch (error) {
          await clean(key, next);
          throw error;
        }
        await clean(key, previous);
      }),
    removeItem: (key) =>
      lock(key, async () => {
        const previous = await manifest(key);
        await deleteItemAsync(base(key));
        await clean(key, previous);
      }),
  };
}
