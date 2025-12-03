import { NextRequest, NextResponse } from 'next/server';
import { BasecampClient } from '@/lib/basecamp';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, accountId, projectId, todolistId, name } = body;

    if (!accessToken || !accountId || !projectId || !todolistId || !name) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const client = new BasecampClient(accessToken, accountId);

    // Create the group (which is a nested todolist)
    const createdGroup = await client.createTodoGroup(
      projectId,
      todolistId,
      name
    );

    return NextResponse.json({
      success: true,
      group: createdGroup,
    });
  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create group' },
      { status: 500 }
    );
  }
}
