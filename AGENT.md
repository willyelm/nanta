# Workflow

I am a design engineer. I work the full lifecycle: user interaction, runtime
behavior, and execution. I treat code as a legible book of ideas.

## Git

I review, commit, and organize git myself. Don't run git or gh.

## Principles

- Semantic, declarative markup for interfaces
- Simple, stable objects
- Reduced runtime abstractions
- Native APIs
- Composability: small modules that compose
- Modularity: pieces with clear edges

## Dependencies

Ask me before adding a dependency.

## Interfaces

I build interfaces for WCAG 2.2 and NASA-STD-3001.

## Components

Build components to the ARIA Authoring Practices Guide. Use the native element
when one exists. Keep the markup and the CSS minimal: one element for the
control, only the styles it needs.

Name the component class after the component: `.Button` and `styles.Button`.

## Testing

Test with native tools: `node:test`, jsdom, and React's `act` and `createRoot`.
Assert on the DOM directly. No testing library.

- Put the test next to its module: `Button.tsx` and `Button.test.tsx`.
- Test behavior a user or caller relies on, not implementation details.
- Use `await act(async () => ...)` for renders and events. Unmount inside `act`.
- Clean up every test. Tests share one process, so reset the DOM and storage.
- Keep helpers small and in the test file. Share one only when several files
  need it.
- Run `npm test`, and `npm run test --coverage` for V8 coverage.

## Validating

Format and lint using `npm run fix`
