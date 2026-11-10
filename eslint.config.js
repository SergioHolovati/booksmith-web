// @ts-check
// Saúde do código do app (scripts/saude.ps1 no repositório da API roda junto com o resto).
// "error" bloqueia; "warn" é só relatório (complexidade: mostra onde refatorar aos poucos).
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'app', style: 'camelCase' }],
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'app', style: 'kebab-case' }],

      // ===== Código limpo =====
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      eqeqeq: ['error', 'always'],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      complexity: ['warn', 15],
      'max-depth': ['warn', 4],
      'max-params': ['warn', 5],
      'max-lines-per-function': ['warn', { max: 80, skipBlankLines: true, skipComments: true }],

      // ===== Segurança =====
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-restricted-syntax': [
        'error',
        {
          // Desliga a proteção do Angular contra XSS; texto do autor nunca pode passar por aqui
          selector: "MemberExpression[property.name=/^bypassSecurityTrust/]",
          message: 'bypassSecurityTrust* desliga a proteção contra XSS. Monte o conteúdo sem HTML cru.',
        },
      ],
    },
  },
  {
    // ===== Arquitetura: core e shared não dependem de features (a seta aponta para um lado só) =====
    files: ['src/app/core/**/*.ts', 'src/app/shared/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['**/features/**'], message: 'core e shared não importam features: mova o código para cá.' }] },
      ],
    },
  },
  {
    // Testes podem ser mais longos e usar dublês simples
    files: ['**/*.spec.ts'],
    rules: {
      'max-lines-per-function': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
]);
