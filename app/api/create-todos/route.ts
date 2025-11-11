import { NextRequest, NextResponse } from 'next/server';
import { BasecampClient } from '@/lib/basecamp';
import { parseMarkdownToTodos } from '@/lib/markdown-parser';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, accountId, projectId, markdown } = body;

    if (!accessToken || !accountId || !projectId || !markdown) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const client = new BasecampClient(accessToken, accountId);

    // Get project details to find todoset ID
    const project = await client.getProject(projectId);
    const todosetId = await client.getTodoSetId(project);

    // Parse markdown into todo lists
    const todoLists = parseMarkdownToTodos(markdown);

    if (todoLists.length === 0) {
      return NextResponse.json(
        { error: 'No todo lists found in markdown' },
        { status: 400 }
      );
    }

    // Create each todo list and its todos
    const results = [];
    for (const list of todoLists) {
      // Create the todo list
      const createdList = await client.createTodoList(
        projectId,
        todosetId,
        list.name,
        list.description
      );

      // Create each todo in the list
      const createdTodos = [];
      for (const todo of list.todos) {
        const createdTodo = await client.createTodo(
          projectId,
          createdList.id,
          todo.content
        );
        createdTodos.push(createdTodo);
      }

      results.push({
        list: createdList,
        todos: createdTodos,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Created ${results.length} todo lists with ${results.reduce((sum, r) => sum + r.todos.length, 0)} todos`,
      results,
    });
  } catch (error) {
    console.error('Error creating todos:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create todos' },
      { status: 500 }
    );
  }
}
