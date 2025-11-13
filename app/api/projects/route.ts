import { NextRequest, NextResponse } from 'next/server';
import { BasecampClient } from '@/lib/basecamp';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const accessToken = searchParams.get('access_token');
  const accountId = searchParams.get('account_id');

  if (!accessToken || !accountId) {
    return NextResponse.json(
      { error: 'Missing access token or account ID' },
      { status: 401 }
    );
  }

  try {
    const client = new BasecampClient(accessToken, accountId);
    const projects = await client.getProjects();

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}
