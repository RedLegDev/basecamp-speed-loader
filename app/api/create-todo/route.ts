import { NextRequest, NextResponse } from 'next/server';
import { BasecampClient } from '@/lib/basecamp';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, accountId, projectId, todolistId, content } = body;

    if (!accessToken || !accountId || !projectId || !todolistId || !content) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const client = new BasecampClient(accessToken, accountId);

    // Create the todo
    const createdTodo = await client.createTodo(
      projectId,
      todolistId,
      content
    );

    return NextResponse.json({
      success: true,
      todo: createdTodo,
    });
  } catch (error) {
    console.error('Error creating todo:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create todo' },
      { status: 500 }
    );
  }
}
