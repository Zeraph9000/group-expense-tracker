const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type RequestOptions = {
  method?: string;
  body?: unknown;
  cookie?: string; // for server-side requests
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public error: string,
    message: string,
  ) {
    super(message);
  }
}

export async function apiClient<T>(
  path: string,
  { method = 'GET', body, cookie }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // When called server-side (getServerSideProps), forward the cookie
  if (cookie) {
    headers['Cookie'] = cookie;
  }

  const res = await fetch(`${API_URL}/v1${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include', // send cookies on client-side requests
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.error ?? 'unknown_error', data.message ?? 'Something went wrong');
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json();
}
