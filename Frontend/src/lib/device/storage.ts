const KEY = "multisaude.dispositivo";
const typedKey = (tipo: StoredDevice["tipo"]) => `${KEY}.${tipo}`;

export interface StoredDevice { token: string; tipo?: "totem" | "painel" }

export function loadDevice(tipo?: StoredDevice["tipo"]): StoredDevice | null {
  try {
    const raw = localStorage.getItem(tipo ? typedKey(tipo) : KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<StoredDevice>;
    if (typeof value.token !== "string" || value.token.length === 0) return null;
    // A chave antiga não informa o tipo. Ela continua válida apenas para o
    // totem, evitando que um token de totem seja tentado no painel.
    if (tipo && value.tipo && value.tipo !== tipo) return null;
    if (tipo && !value.tipo && tipo !== "totem") return null;
    return { token: value.token, tipo: value.tipo ?? tipo };
  } catch { return null; }
}

export function saveDevice(device: StoredDevice): void {
  try {
    localStorage.setItem(typedKey(device.tipo ?? "totem"), JSON.stringify(device));
    // Compatibilidade com instalações antigas do totem.
    if ((device.tipo ?? "totem") === "totem") localStorage.setItem(KEY, JSON.stringify(device));
  } catch { /* armazenamento indisponível */ }
}

export function clearDevice(tipo?: StoredDevice["tipo"]): void {
  try {
    if (tipo) localStorage.removeItem(typedKey(tipo));
    else localStorage.removeItem(KEY);
  } catch { /* armazenamento indisponível */ }
}
