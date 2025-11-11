export interface BasecampProject {
  id: number;
  name: string;
  description: string;
  dock: Array<{
    id: number;
    name: string;
    title: string;
    url: string;
  }>;
}

export interface TodoSet {
  id: number;
  url: string;
}

export interface TodoList {
  id: number;
  name: string;
  description?: string;
}

export interface Todo {
  id: number;
  content: string;
}

export class BasecampClient {
  private accessToken: string;
  private accountId: string;
  private baseUrl: string;

  constructor(accessToken: string, accountId: string) {
    this.accessToken = accessToken;
    this.accountId = accountId;
    this.baseUrl = `https://3.basecampapi.com/${accountId}`;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'User-Agent': 'Basecamp Speed Loader (your-email@example.com)',
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Basecamp API error: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    return response.json();
  }

  async getProjects(): Promise<BasecampProject[]> {
    return this.request<BasecampProject[]>('/projects.json');
  }

  async getProject(projectId: number): Promise<BasecampProject> {
    return this.request<BasecampProject>(`/projects/${projectId}.json`);
  }

  async getTodoSetId(project: BasecampProject): Promise<number> {
    const todosetDock = project.dock.find(item => item.name === 'todoset');
    if (!todosetDock) {
      throw new Error('No todoset found in project');
    }
    return todosetDock.id;
  }

  async createTodoList(
    bucketId: number,
    todosetId: number,
    name: string,
    description?: string
  ): Promise<TodoList> {
    return this.request<TodoList>(
      `/buckets/${bucketId}/todosets/${todosetId}/todolists.json`,
      {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      }
    );
  }

  async createTodo(
    bucketId: number,
    todolistId: number,
    content: string
  ): Promise<Todo> {
    return this.request<Todo>(
      `/buckets/${bucketId}/todolists/${todolistId}/todos.json`,
      {
        method: 'POST',
        body: JSON.stringify({ content }),
      }
    );
  }
}

/**
 * Get OAuth authorization URL
 */
export function getAuthorizationUrl(): string {
  const clientId = process.env.BASECAMP_CLIENT_ID;
  const redirectUri = process.env.BASECAMP_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error('Missing OAuth configuration');
  }

  const params = new URLSearchParams({
    type: 'web_server',
    client_id: clientId,
    redirect_uri: redirectUri,
  });

  return `https://launchpad.37signals.com/authorization/new?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token: string;
}> {
  const clientId = process.env.BASECAMP_CLIENT_ID;
  const clientSecret = process.env.BASECAMP_CLIENT_SECRET;
  const redirectUri = process.env.BASECAMP_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing OAuth configuration');
  }

  const response = await fetch('https://launchpad.37signals.com/authorization/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'web_server',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange authorization code');
  }

  return response.json();
}

/**
 * Get user's accounts (to extract account ID)
 */
export async function getUserAccounts(accessToken: string): Promise<Array<{
  product: string;
  id: number;
  name: string;
  href: string;
}>> {
  const response = await fetch('https://launchpad.37signals.com/authorization.json', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get user accounts');
  }

  const data = await response.json();
  return data.accounts || [];
}
