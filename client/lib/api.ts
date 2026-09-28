export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Unable to connect to the marketplace API. Check that the Express server is running.");
    }
    throw error;
  }
  if (!response.ok) {
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }
    const text = await response.text();
    if (text.startsWith("<!DOCTYPE")) {
      throw new Error(`Server returned HTML instead of JSON. This usually means the API endpoint was not found or the server is misconfigured. (Status: ${response.status})`);
    }
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

export function withBearer(token: string, options: RequestInit = {}): RequestInit {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return { ...options, headers };
}
