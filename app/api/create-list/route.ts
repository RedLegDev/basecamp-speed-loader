import { NextRequest, NextResponse } from 'next/server';
import { BasecampClient } from '@/lib/basecamp';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, accountId, projectId, name, description } = body;

    if (!accessToken || !accountId || !projectId || !name) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const client = new BasecampClient(accessToken, accountId);

    // Get project details to find todoset ID
    const project = await client.getProject(projectId);
    const todosetId = await client.getTodoSetId(project);

    // Create the todo list
    const createdList = await client.createTodoList(
      projectId,
      todosetId,
      name,
      description
    );

    return NextResponse.json({
      success: true,
      list: createdList,
    });
  } catch (error) {
    console.error('Error creating list:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create list' },
      { status: 500 }
    );
  }
}
