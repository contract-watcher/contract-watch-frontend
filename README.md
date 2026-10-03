![build](https://github.com/contract-watcher/contract-watcher-frontend/actions/workflows/build.yml/badge.svg)
![release](https://github.com/contract-watcher/contract-watcher-frontend/actions/workflows/release.yml/badge.svg)

# ContractWatch — Frontend

Веб-интерфейс сервиса **ContractWatch**: контроль изменений во внешних интеграциях (Jira, Shopify, GitHub). Дашборд, настройка интеграций, редактор контракта, инциденты и история проверок.

## Стек

- Vue 3 + TypeScript (`<script setup>`, Composition API)
- Vite — сборка и dev-сервер
- Bun — рантайм и пакетный менеджер
- Vue Router, Pinia
- TanStack Query (Vue Query) — запросы к API и кэш
- Ant Design Vue — UI
- ESLint + Prettier, Husky, lint-staged, commitlint

## Требования

- [Bun](https://bun.sh/) ≥ 1.3

Проект использует **только Bun**. npm / yarn / pnpm не применяем, их lock-файлы игнорируются.

## Команды

| Команда             | Назначение                                   |
| ------------------- | -------------------------------------------- |
| `bun install`       | Установка зависимостей                       |
| `bun run dev`       | Dev-сервер (Vite)                            |
| `bun run build`     | Проверка типов + production-сборка в `dist/` |
| `bun run preview`   | Локальный просмотр собранного билда          |
| `bun run lint`      | ESLint (`lint:fix` — с автоисправлением)     |
| `bun run typecheck` | Проверка типов (`vue-tsc`)                   |
| `bun run format`    | Prettier (`ci:format` — проверка без записи) |

## Переменные окружения

Скопируй `.env.example` в `.env` и заполни:

| Переменная     | Назначение                             |
| -------------- | -------------------------------------- |
| `VITE_API_URL` | Базовый адрес API бэкенда              |
| `VITE_WS_URL`  | Адрес WebSocket (реалтайм-уведомления) |

## Соглашения

Правила разработки, стиль кода и Git-процесс — в [CONTRIBUTING.md](./CONTRIBUTING.md).
