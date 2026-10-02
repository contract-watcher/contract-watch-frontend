# Как мы работаем над ContractWatch Frontend

## Инструменты

| Инструмент          | За что отвечает                                               | Команда                                |
| ------------------- | ------------------------------------------------------------- | -------------------------------------- |
| Prettier            | форматирование (120 символов, LF, 2 пробела, двойные кавычки) | `bun run format` / `bun run ci:format` |
| ESLint              | линт: порядок импортов, неиспользуемый код, Vue-правила       | `bun run lint` / `bun run lint:fix`    |
| EditorConfig        | отступы, LF, UTF-8                                            | автоматически в редакторе              |
| Husky + lint-staged | проверки перед коммитом                                       | автоматически                          |
| commitlint          | формат коммитов                                               | автоматически                          |

Правило: **не обходим хуки** (`--no-verify` запрещён). Упала проверка — чиним причину.

## Код

- `const` по умолчанию; `let` — только когда значение переприсваивается (проверяет ESLint)
- Сравнения — только `===`/`!==`; `==`/`!=` запрещены (проверяет ESLint)
- Ранние return вместо вложенных `if`/`else`; никакого `else` после `return` (проверяет ESLint)
- Функция делает одну вещь; длина — до 100 строк (проверяет ESLint)
- Сложную логику выносим в composables; компонент отвечает за отображение

## Именование

- Компоненты Vue — PascalCase, минимум два слова: `IncidentCard.vue`
- Страницы — `XxxView.vue` в `src/pages/`
- Composables — `useXxx` в `src/composables/`: `useIncidents.ts`
- Pinia-сторы — `useXxxStore` в `src/stores/`
- API-модули — в `src/api/`
- Типы и интерфейсы — PascalCase, без префикса `I`: `Incident`, `Integration`
- Переменные и функции — camelCase, константы — `UPPER_SNAKE_CASE`

## Импорты

- Порядок и группировку сортирует ESLint — вручную не выравниваем
- Type-only импорты — через `import type`
- Внутри `src/` используем alias `@/`: `@/api/client`, а не `../../api/client`

## Vue

- Всегда `<script setup lang="ts">`, Composition API. Options API не используем (проверяет ESLint)
- Порядок блоков в SFC: `<script>` → `<template>` → `<style>` (проверяет ESLint)
- Props и emits — типизированные: `defineProps<Props>()`, `defineEmits<Emits>()`
- Общая логика — в composables, а не в компонентах и не в глобальном сторе
- Серверные данные — через Vue Query; Pinia — только для клиентского/глобального UI-состояния

## TypeScript

- `any` — жёсткий запрет. Тип неизвестен — `unknown` и сужение
- Типы API-сущностей живут рядом с api-слоем
- Комментарии — только там, где код не объясняет сам себя, и на английском

## Git

- Ветки: `main` — стабильная, рабочие — `<type>/<kebab-case>`: `feat/integration-list`, `fix/status-tag`, `chore/deps`
- PR — всегда в `main`, короткими порциями
- Коммиты — Conventional Commits: `feat: add integration list`, `fix: handle empty contract`
- Хуки: `pre-commit` — lint-staged + typecheck, `commit-msg` — commitlint, `pre-push` — проверка имени ветки

## Язык

- Имена в коде, комментарии и коммиты — английский
- Заголовки PR — на английском в формате Conventional Commits (`feat: ...`), даже если описание на русском
- README, документация, описания PR и UI-тексты — русский
