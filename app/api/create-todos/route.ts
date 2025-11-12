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

    // Create each todo list, its groups, and todos
    const results = [];
    for (const list of todoLists) {
      // Create the todo list
      const createdList = await client.createTodoList(
        projectId,
        todosetId,
        list.name,
        list.description
      );

      const createdGroups = [];

      // Create groups and their todos
      if (list.groups && list.groups.length > 0) {
        for (const group of list.groups) {
          // Create the group
          const createdGroup = await client.createTodoGroup(
            projectId,
            createdList.id,
            group.name
          );
          console.log(`Created group "${group.name}" with ID: ${createdGroup.id}`);

          // Create todos within the group
          const groupTodos = [];
          for (const todo of group.todos) {
            console.log(`Creating todo "${todo.content}" in group ${createdGroup.id}`);
            const createdTodo = await client.createTodo(
              projectId,
              createdList.id,
              todo.content,
              createdGroup.id
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
      for (const todo of list.todos) {
        const createdTodo = await client.createTodo(
          projectId,
          createdList.id,
          todo.content
        );
        listTodos.push(createdTodo);
      }

      results.push({
        list: createdList,
        groups: createdGroups,
        todos: listTodos,
      });
    }

    const totalTodos = results.reduce((sum, r) => {
      const groupTodos = r.groups?.reduce((gSum, g) => gSum + g.todos.length, 0) || 0;
      return sum + r.todos.length + groupTodos;
    }, 0);
    const totalGroups = results.reduce((sum, r) => sum + (r.groups?.length || 0), 0);

    return NextResponse.json({
      success: true,
      message: `Created ${results.length} todo lists with ${totalGroups} groups and ${totalTodos} todos`,
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
