# Tech Debt

- Improve this document as needed. Remove things as you complete them.

## Cleanup and Refactoring

- Go through every single file and folder with a fine tooth comb. identify the areas of improvement such as:
  - Identify high line of code files for potential splitting
  - Remove any css from jsx files and place in separate standard css files
  - Modularize shared UI components or commonly used functions or utilities
  - Improve test coverage for critical game logic functions
  - Standardize coding style with ESLint/Prettier configurations
  - Review and update dependencies to latest stable versions
  - Validate our CI checks for code quality and test coverage
  - Document architecture decisions in `docs/ARCHITECTURE.md`
  - Minify any large assets (images/sounds) for faster load times
  - Optimize asset loading with lazy loading or preloading strategies
  - Implement caching strategies for frequently used data or assets
  - Identify code that may not be used or things we can remove (comments, dead code, unused assets, etc) but be prudent to understand what it is first and how it might be used or referenced before removing it.
