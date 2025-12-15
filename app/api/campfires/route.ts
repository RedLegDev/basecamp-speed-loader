import { NextRequest, NextResponse } from 'next/server';
import { BasecampClient } from '@/lib/basecamp';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const accessToken = searchParams.get('access_token');
  const accountId = searchParams.get('account_id');
  const projectId = searchParams.get('project_id');

  if (!accessToken || !accountId || !projectId) {
    return NextResponse.json(
      { error: 'Missing access token, account ID, or project ID' },
      { status: 401 }
    );
  }

  try {
    const client = new BasecampClient(accessToken, accountId);
    const campfires = await client.getCampfires(Number(projectId));

    return NextResponse.json({ campfires });
  } catch (error) {
    console.error('Error fetching campfires:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campfires' },
      { status: 500 }
    );
  }
}

