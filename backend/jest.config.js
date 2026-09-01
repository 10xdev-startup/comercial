/**
 * Jest do backend via ts-jest (env node). O ts-jest type-checa os testes usando
 * o tsconfig estrito do backend — então os testes pegam os mesmos erros de tipo
 * que o `tsc --noEmit` (blueprint §5). O `moduleNameMapper` espelha o alias `@/`.
 *
 * @type {import('ts-jest').JestConfigWithTsJest}
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}
