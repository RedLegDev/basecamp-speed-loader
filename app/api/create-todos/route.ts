import { NextRequest, NextResponse } from 'next/server';
import { BasecampClient } from '@/lib/basecamp';
import { TodoList } from '@/lib/markdown-parser';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, accountId, projectId, todoList } = body;

    if (!accessToken || !accountId || !projectId || !todoList) {
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
      todoList.name,
      todoList.description
    );

    const createdGroups = [];

    // Create groups and their todos
    if (todoList.groups && todoList.groups.length > 0) {
      for (const group of todoList.groups) {
        // Create the group
        const createdGroup = await client.createTodoGroup(
          projectId,
          createdList.id,
          group.name
        );
        console.log(`Created group "${group.name}" with ID: ${createdGroup.id}`);

        // Create todos within the group (nested todolist)
        // The "group" is actually a nested todolist, so we create todos directly in it
        const groupTodos = [];
        for (const todo of group.todos) {
          console.log(`Creating todo "${todo.content}" in nested todolist/group ${createdGroup.id}`);
          const createdTodo = await client.createTodo(
            projectId,
            createdGroup.id, // Create todos in the nested todolist, not the parent
            todo.content
          );
          groupTodos.push(createdTodo);
        }

        createdGroups.push({
          group: createdGroup,
          todos: groupTodos,
        });
      }
    }

    // Create todos directly in the list (outside of groups)
    const listTodos = [];
    for (const todo of todoList.todos) {
      const createdTodo = await client.createTodo(
        projectId,
        createdList.id,
        todo.content
      );
      listTodos.push(createdTodo);
    }

    const totalTodos = listTodos.length + createdGroups.reduce((sum, g) => sum + g.todos.length, 0);
    const totalGroups = createdGroups.length;

    return NextResponse.json({
      success: true,
      message: `Created todo list "${todoList.name}" with ${totalGroups} groups and ${totalTodos} todos`,
      result: {
        list: createdList,
        groups: createdGroups,
        todos: listTodos,
      },
    });
  } catch (error) {
    console.error('Error creating todos:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create todos' },
      { status: 500 }
    );
  }
}
