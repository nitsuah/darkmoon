import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Mock Spline for all tests
vi.mock('@splinetool/react-spline', () => ({
    __esModule: true,
    default: () => null,
}))

// Polyfill ResizeObserver for React Three Fiber tests
if (typeof window !== 'undefined' && !window.ResizeObserver) {
    window.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
}

// Silence known noisy React-Three-Fiber DOM warnings during tests
if (typeof console !== 'undefined') {
    const _warn = console.warn.bind(console)
    console.warn = (...args: unknown[]) => {
        try {
            const msg = String(args[0] ?? '')
            // ignore casing and unknown DOM prop warnings from R3F in jsdom test env
            if (
                msg.includes('is using incorrect casing') ||
                msg.includes('is unrecognized in this browser') ||
                msg.includes('React does not recognize the')
            ) {
                return
            }
        } catch {
            // fallthrough
        }
        _warn(...args)
    }

    const _error = console.error.bind(console)
    console.error = (...args: unknown[]) => {
        try {
            const msg = String(args[0] ?? '')
            // also suppress react runtime casing/unknown-prop errors printed as errors
            if (
                msg.includes('is using incorrect casing') ||
                msg.includes('is unrecognized in this browser') ||
                msg.includes('React does not recognize the') ||
                msg.includes('Received `true` for a non-boolean attribute')
            ) {
                return
            }
        } catch {
            // fallthrough
        }
        _error(...args)
    }
}
