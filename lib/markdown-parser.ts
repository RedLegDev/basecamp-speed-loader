export interface TodoItem {
  content: string;
}

export interface TodoList {
  name: string;
  description?: string;
  todos: TodoItem[];
}

/**
 * Parses markdown into todo lists and todos
 * Headers (# or ##) become todo list names
 * List items (- or *) become todos under the most recent header
 */
export function parseMarkdownToTodos(markdown: string): TodoList[] {
  const lines = markdown.split('\n');
  const todoLists: TodoList[] = [];
  let currentList: TodoList | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines
    if (!trimmedLine) {
      continue;
    }

    // Check for headers (# Header or ## Header)
    const headerMatch = trimmedLine.match(/^#{1,6}\s+(.+)$/);
    if (headerMatch) {
      // Save previous list if it exists
      if (currentList && currentList.todos.length > 0) {
        todoLists.push(currentList);
      }

      // Start new list
      currentList = {
        name: headerMatch[1].trim(),
        todos: []
      };
      continue;
    }

    // Check for list items (- item or * item)
    const listItemMatch = trimmedLine.match(/^[-*]\s+(.+)$/);
    if (listItemMatch) {
      const todoContent = listItemMatch[1].trim();

      // If no current list exists, create a default one
      if (!currentList) {
        currentList = {
          name: 'Tasks',
          todos: []
        };
      }

      currentList.todos.push({
        content: todoContent
      });
    }
  }

  // Add the last list if it exists
  if (currentList && currentList.todos.length > 0) {
    todoLists.push(currentList);
  }

  return todoLists;
}

/**
 * Example markdown format:
 *
 * # Design Phase
 * - Create wireframes
 * - Design mockups
 * - Get client approval
 *
 * # Development Phase
 * - Set up project structure
 * - Implement authentication
 * - Build main features
 */
