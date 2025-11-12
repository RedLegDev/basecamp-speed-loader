export interface TodoItem {
  content: string;
}

export interface TodoGroup {
  name: string;
  todos: TodoItem[];
}

export interface TodoList {
  name: string;
  description?: string;
  groups?: TodoGroup[];
  todos: TodoItem[];
}

/**
 * Parses markdown into todo lists, groups, and todos
 * # headers become todo lists
 * ## headers become todo groups (within the current list)
 * List items (- or *) become todos (in the current group or list)
 */
export function parseMarkdownToTodos(markdown: string): TodoList[] {
  const lines = markdown.split('\n');
  const todoLists: TodoList[] = [];
  let currentList: TodoList | null = null;
  let currentGroup: TodoGroup | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines
    if (!trimmedLine) {
      continue;
    }

    // Check for level 1 header (# Header) - creates a new todo list
    const h1Match = trimmedLine.match(/^#\s+(.+)$/);
    if (h1Match) {
      // Save previous list if it exists
      if (currentList) {
        // Only add list if it has content (todos or groups)
        if (currentList.todos.length > 0 || (currentList.groups && currentList.groups.length > 0)) {
          todoLists.push(currentList);
        }
      }

      // Start new list
      currentList = {
        name: h1Match[1].trim(),
        todos: [],
        groups: []
      };
      currentGroup = null; // Reset group when starting a new list
      continue;
    }

    // Check for level 2 header (## Header) - creates a new todo group
    const h2Match = trimmedLine.match(/^##\s+(.+)$/);
    if (h2Match) {
      // If no current list exists, create a default one
      if (!currentList) {
        currentList = {
          name: 'Tasks',
          todos: [],
          groups: []
        };
      }

      // Ensure groups array exists
      if (!currentList.groups) {
        currentList.groups = [];
      }

      // Start new group
      currentGroup = {
        name: h2Match[1].trim(),
        todos: []
      };
      currentList.groups.push(currentGroup);
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
          todos: [],
          groups: []
        };
      }

      // Add todo to current group if it exists, otherwise to the list
      if (currentGroup) {
        currentGroup.todos.push({
          content: todoContent
        });
      } else {
        currentList.todos.push({
          content: todoContent
        });
      }
    }
  }

  // Add the last list if it exists
  if (currentList) {
    if (currentList.todos.length > 0 || (currentList.groups && currentList.groups.length > 0)) {
      todoLists.push(currentList);
    }
  }

  return todoLists;
}

/**
 * Example markdown format:
 *
 * # Project Tasks
 * ## Design Phase
 * - Create wireframes
 * - Review mockups
 * ## Development Phase
 * - Set up environment
 * - Implement auth
 * - Deploy
 *
 * # Another List
 * - Task without group
 */
