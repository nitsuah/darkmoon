// Temporary declaration to satisfy TypeScript when files reference
// the @react-three/fiber automatic JSX runtime module. This re-exports
// React's jsx-runtime types so tsc doesn't require the actual module
// to be present at compile time.

declare module "@react-three/fiber/jsx-runtime" {
  export * from "react/jsx-runtime";
}
