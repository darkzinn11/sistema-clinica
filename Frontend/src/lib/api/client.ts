/** Cliente HTTP do backend. Sem biblioteca: fetch + Bearer + erro tipado. As URLs são relativas (/api/v1): o Vite faz proxy em desenvolvimento. */

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

let tokenProvider: () => string | null = () => null;
let unauthorizedHandler: () => void = () => {};

/** O AuthProvider registra de onde sai o token e o que fazer quando o servidor diz que a sessão acabou. */
export function configureApi(options: { token: () => string | null; onUnauthorized: () => void }) {
  tokenProvider = options.token;
  unauthorizedHandler = options.onUnauthorized;
}

type Query = Record<string, string | number | boolean | null | undefined>;

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  query?: Query;
  body?: unknown;
  signal?: AbortSignal;
  /** Login e afins: um 401 aqui é "senha errada", não "sessão expirada". */
  public?: boolean;
  /** Credencial de um dispositivo, sem afetar a sessão da pessoa. */
  token?: string;
}

function url(path: string, query?: Query): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return `/api/v1${path}${qs ? `?${qs}` : ""}`;
}

async function request(path: string, options: RequestOptions): Promise<{ body: unknown; headers: Headers }> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const userToken = options.public ? null : tokenProvider();
  const token = options.token ?? userToken;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(url(path, options.query), {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new ApiError(0, "Não foi possível falar com o servidor. Verifique sua conexão.", null);
  }

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  if (!response.ok) {
    // Um request sem sessão ainda não é motivo para limpar o localStorage. Isso
    // evita logout em uma aba recém-aberta, antes do AuthProvider terminar de
    // registrar o token. Credenciais de dispositivo nunca encerram a sessão humana.
    if (response.status === 401 && Boolean(userToken) && !options.token) unauthorizedHandler();
    const message = (body && typeof body === "object" && "erro" in body && typeof (body as { erro: unknown }).erro === "string")
      ? (body as { erro: string }).erro
      : `Erro ${response.status}`;
    throw new ApiError(response.status, message, body);
  }
  return { body, headers: response.headers };
}

export async function api<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  return (await request(path, options)).body as T;
}

/** Lista paginada: o total vem no cabeçalho X-Total-Count. */
export async function apiPage<T>(path: string, options: RequestOptions = {}): Promise<{ items: T[]; total: number }> {
  const { body, headers } = await request(path, options);
  const items = (body ?? []) as T[];
  return { items, total: Number(headers.get("X-Total-Count") ?? items.length) };
}
