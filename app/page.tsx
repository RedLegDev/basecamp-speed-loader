'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { parseMarkdownToTodos } from '@/lib/markdown-parser';

interface Project {
  id: number;
  name: string;
  description: string;
}

const EXAMPLE_MARKDOWN = `# Design Phase
- Create wireframes
- Design mockups
- Get client approval

# Development Phase
- Set up project structure
- Implement authentication
- Build main features
- Write tests

# Launch Phase
- Deploy to production
- Monitor for issues
- Gather user feedback`;

function HomeContent() {
  const searchParams = useSearchParams();
  const [accessToken, setAccessToken] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [markdown, setMarkdown] = useState<string>(EXAMPLE_MARKDOWN);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [progress, setProgress] = useState<string>('');

  useEffect(() => {
    // Check for OAuth callback parameters
    const token = searchParams.get('access_token');
    const account = searchParams.get('account_id');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(`Authentication error: ${errorParam}`);
    }

    if (token && account) {
      setAccessToken(token);
      setAccountId(account);
      fetchProjects(token, account);
    }
  }, [searchParams]);

  const fetchProjects = async (token: string, account: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/projects?access_token=${encodeURIComponent(token)}&account_id=${encodeURIComponent(account)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const data = await response.json();
      setProjects(data.projects);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    window.location.href = '/api/auth/login';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setProgress('');

    if (!selectedProject) {
      setError('Please select a project');
      setLoading(false);
      return;
    }

    try {
      // Parse markdown on the client side
      const todoLists = parseMarkdownToTodos(markdown);

      if (todoLists.length === 0) {
        setError('No todo lists found in markdown');
        setLoading(false);
        return;
      }

      const results = [];
      const errors: string[] = [];

      // Process each todo list separately
      for (let i = 0; i < todoLists.length; i++) {
        const todoList = todoLists[i];
        setProgress(`Creating list ${i + 1} of ${todoLists.length}: "${todoList.name}"...`);

        try {
          const response = await fetch('/api/create-todos', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              accessToken,
              accountId,
              projectId: selectedProject,
              todoList,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || `Failed to create list "${todoList.name}"`);
          }

          results.push(data.result);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : `Failed to create list "${todoList.name}"`;
          errors.push(errorMessage);
          console.error(`Error creating list "${todoList.name}":`, err);
          // Continue with remaining lists even if one fails
        }
      }

      // Build summary message
      const totalLists = results.length;
      const totalGroups = results.reduce((sum: number, r) => sum + (r.groups?.length || 0), 0);
      const totalTodos = results.reduce((sum: number, r) => {
        const groupTodos = r.groups?.reduce((gSum: number, g: { todos: any[] }) => gSum + g.todos.length, 0) || 0;
        return sum + r.todos.length + groupTodos;
      }, 0);

      if (errors.length > 0) {
        setError(
          `Completed with errors: ${errors.length} list(s) failed. ` +
          `Successfully created ${totalLists} todo list(s) with ${totalGroups} groups and ${totalTodos} todos. ` +
          `Errors: ${errors.join('; ')}`
        );
      } else {
        setSuccess(
          `Successfully created ${totalLists} todo list(s) with ${totalGroups} groups and ${totalTodos} todos`
        );
        setMarkdown('');
      }

      setProgress('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create todos');
      setProgress('');
    } finally {
      setLoading(false);
    }
  };

  const isConnected = !!accessToken && !!accountId;

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Basecamp Speed Loader
          </h1>
          <p className="text-gray-600">
            Quickly load project breakdowns into Basecamp 3
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {progress && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
              <p className="text-blue-800">{progress}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-8">
          {!isConnected ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-16 w-16 text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Connect to Basecamp
              </h2>
              <p className="text-gray-600 mb-6">
                Sign in with your Basecamp account to get started
              </p>
              <button
                onClick={handleConnect}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Connect to Basecamp
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="project"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Select Project
                </label>
                <select
                  id="project"
                  value={selectedProject || ''}
                  onChange={(e) => setSelectedProject(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Choose a project...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="markdown"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Project Breakdown (Markdown)
                </label>
                <div className="mb-2 text-sm text-gray-500">
                  Use # for todo lists, ## for task groups, and - for todos:
                </div>
                <textarea
                  id="markdown"
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  rows={16}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  placeholder={EXAMPLE_MARKDOWN}
                  required
                />
                <div className="mt-2 text-xs text-gray-500">
                  <p>• Use <code className="bg-gray-100 px-1 rounded">#</code> for todo lists</p>
                  <p>• Use <code className="bg-gray-100 px-1 rounded">##</code> for task groups (within lists)</p>
                  <p>• Use <code className="bg-gray-100 px-1 rounded">-</code> or <code className="bg-gray-100 px-1 rounded">*</code> for todo items</p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Todo Lists'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Need help? Use <code className="bg-gray-100 px-1 rounded">#</code> for todo lists,{' '}
            <code className="bg-gray-100 px-1 rounded">##</code> for task groups, and{' '}
            <code className="bg-gray-100 px-1 rounded">-</code> for todo items.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
