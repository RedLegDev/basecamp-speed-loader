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

export interface TodoGroup {
  id: number;
  name: string;
}

export interface Todo {
  id: number;
  content: string;
}

export interface Campfire {
  id: number;
  title: string;
  status: string;
  bucket: {
    id: number;
    name: string;
    type: string;
  };
}

export class BasecampClient {
  private accessToken: string;
  private accountId: string;
  private baseUrl: string;
  private lastRequestTime: number = 0;
  private readonly minRequestInterval: number = 250; // 250ms between requests (50 req/10s = 200ms, using 250ms for safety)

  constructor(accessToken: string, accountId: string) {
    this.accessToken = accessToken;
    this.accountId = accountId;
    this.baseUrl = `https://3.basecampapi.com/${accountId}`;
  }

  /**
   * Ensures we respect rate limits by waiting if necessary
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  private async fetchEndpoint(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<Response> {
    await this.rateLimit();

    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseUrl}${endpoint}`;

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

    // Handle rate limiting (429 Too Many Requests)
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const waitTime = retryAfter 
        ? parseInt(retryAfter, 10) * 1000 // Convert seconds to milliseconds
        : Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10s
      
      if (retryCount < 5) { // Max 5 retries
        console.log(`Rate limited. Waiting ${waitTime}ms before retry ${retryCount + 1}/5`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.fetchEndpoint(endpoint, options, retryCount + 1);
      } else {
        throw new Error('Rate limit exceeded. Too many retries.');
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Basecamp API error: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    return response;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await this.fetchEndpoint(endpoint, options);
    return response.json();
  }

  async getProjects(): Promise<BasecampProject[]> {
    const allProjects: BasecampProject[] = [];
    let nextUrl: string | null = '/projects.json';

    while (nextUrl) {
      const response = await this.fetchEndpoint(nextUrl);
      const projects = (await response.json()) as BasecampProject[];
      allProjects.push(...projects);

      nextUrl = this.getNextLink(response.headers.get('Link'));
    }

    return allProjects.sort((a, b) => a.name.localeCompare(b.name));
  }

  private getNextLink(linkHeader: string | null): string | null {
    if (!linkHeader) {
      return null;
    }

    const links = linkHeader.split(',').map(part => part.trim());

    for (const link of links) {
      const match = link.match(/<([^>]+)>;\s*rel="([^"]+)"/);
      if (match && match[2] === 'next') {
        const nextUrl = match[1];
        return nextUrl.startsWith(this.baseUrl)
          ? nextUrl.replace(this.baseUrl, '')
          : nextUrl;
      }
    }

    return null;
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

  async createTodoGroup(
    bucketId: number,
    todolistId: number,
    name: string
  ): Promise<TodoGroup> {
    const response = await this.request<any>(
      `/buckets/${bucketId}/todolists/${todolistId}/groups.json`,
      {
        method: 'POST',
        body: JSON.stringify({ name }),
      }
    );
    console.log('Group creation response:', JSON.stringify(response, null, 2));
    return response;
  }

  async createTodo(
    bucketId: number,
    todolistId: number,
    content: string
  ): Promise<Todo> {
    const body = { content };

    const requestBody = JSON.stringify(body);
    console.log(`Creating todo in list ${todolistId}:`, requestBody);

    return this.request<Todo>(
      `/buckets/${bucketId}/todolists/${todolistId}/todos.json`,
      {
        method: 'POST',
        body: requestBody,
      }
    );
  }

  async getCampfires(projectId: number): Promise<Campfire[]> {
    const allCampfires: Campfire[] = [];
    let nextUrl: string | null = `/buckets/${projectId}/chats.json`;

    while (nextUrl) {
      const response = await this.fetchEndpoint(nextUrl);
      const campfires = (await response.json()) as Campfire[];
      allCampfires.push(...campfires);

      nextUrl = this.getNextLink(response.headers.get('Link'));
    }

    return allCampfires.sort((a, b) => a.title.localeCompare(b.title));
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
