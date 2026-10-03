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

## Как оформить PR

В описании укажите:

- Что изменено — списком через -
- Связанный issue — используйте авто-закрытие: Closes #<номер> или связь через поле `development` для PR
- Добавьте нужные labels (например, enhancement) и assignee
- Reviewers назначатся автоматически через `CODEOWNERS`
- type label
- release label: `major`, `minor`, `patch` или `no-release`

> Важно: на момент отправки PR ветка должна быть синхронизирована с актуальным `main`, иначе могут не пройти rule checks / CI

## Labels

Для PR используются два типа labels:

- type labels — описывают, что именно меняется;
- release labels — определяют, будет ли выпущена новая версия и какой тип обновления будет применен.

### Type labels

Type label описывает характер изменения в PR или issue.

Доступные type labels:

- `bug` — исправление ошибки или неработающего поведения
- `documentation` — изменения или дополнения документации
- `duplicate` — issue или pull request уже существует
- `enhancement` — новая функциональность или улучшение существующей логики
- `good first issue` — задача, подходящая для первого вклада
- `help wanted` — требуется дополнительное внимание или помощь
- `invalid` — issue или PR некорректен или неактуален
- `question` — требуется дополнительная информация
- `wontfix` — задача не будет выполняться

Для обычного PR чаще всего используются:

- `enhancement` — для новой функциональности
- `bug` — для исправления ошибки
- `documentation` — для изменений документации

### Release labels

Release label определяет, как PR влияет на версию проекта

Доступные release labels:

- `major` — мажорное обновление, несовместимое с предыдущей версией
- `minor` — минорное обновление, новая функциональность без breaking changes
- `patch` — patch-обновление, исправление ошибок или небольшие безопасные правки
- `no-release` — изменения без выпуска новой версии

Release label используется CI/CD для автоматического обновления версии, создания git tag и публикации Docker image в GHCR

Если PR не должен приводить к выпуску новой версии, используйте: `no-release`

## Язык

- Имена в коде, комментарии и коммиты — английский
- Заголовки PR — на английском в формате Conventional Commits (`feat: ...`), даже если описание на русском
- README, документация, описания PR и UI-тексты — русский
