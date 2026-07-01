import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./config/vitest.setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                '**/*.css',
                'src/styles/**',
                'src/assets/**',
                '**/*.{png,jpg,jpeg,gif,svg,webp}',
                // Realtime-heavy modules are validated by integration/smoke tests; exclude from line coverage gate.
                'src/components/characters/PlayerCharacter.tsx',
                'src/pages/Solo.tsx',
                'src/components/SoundManager.ts',
                'src/components/SpacemanModel.tsx',
                'src/components/MobileJoystick.tsx',
                'src/components/PerformanceMonitor.tsx',
                'src/pages/Lobby.tsx',
                'src/lib/hooks/usePlayerTagging.ts',
                'src/lib/hooks/useSocketConnection.ts',
                'src/pages/Home.tsx',
                'src/components/QualitySettings.tsx',
                'src/components/SoundEngine.ts',
                'src/components/characters/BotCharacter.tsx',
                'src/lib/hooks/useQualitySettings.ts',
            ],
        },
        exclude: ['e2e/**', 'e2e/**/*', 'node_modules/**', 'node_modules/**/*'],
        // Use default pool (let Vitest pick the best runner for the environment)
    },
})
