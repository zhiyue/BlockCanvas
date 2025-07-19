import '@testing-library/jest-dom'

// Mock console.log to avoid noise in tests
global.console = {
  ...console,
  log: vi.fn(),
}