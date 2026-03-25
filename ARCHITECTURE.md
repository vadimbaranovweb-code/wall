# Wall — Architecture Documentation
*Последнее обновление: 25 марта 2026*

## Что такое Wall
Инструмент для быстрого захвата мыслей, ссылок и изображений в виде карточек на свободной доске. Не whiteboard, не Notion — быстрый brain dump tool.

**Главный принцип:** Paste → карточка появилась → продолжаешь думать.

---

## Стек
- **Frontend:** React 18 + TypeScript + Vite
- **Стили:** Tailwind CSS
- **Стейт:** Zustand
- **База данных:** Supabase (PostgreSQL + Auth + Storage)
- **Деплой:** Vercel
- **ID генерация:** nanoid

---

## Структура проекта
```
src/
├── types/index.ts              # Все TypeScript типы
├── lib/
│   ├── supabase.ts             # Supabase клиент + типы DB строк
│   ├── mappers.ts              # DB rows ↔ app types конвертация
│   ├── cn.ts                   # clsx + tailwind-merge хелпер
│   ├── id.ts                   # nanoid wrapper
│   └── imageUtils.ts           # Resize изображений, URL хелперы
│
├── stores/                     # Zustand stores (глобальный стейт)
│   ├── authStore.ts            # User, session, isAnonymous
│   ├── boardStore.ts           # Камера (pan/zoom), selectedCardId
│   ├── cardsStore.ts           # Карточки, drag/resize позиции
│   ├── wallsStore.ts           # Стены CRUD
│   └── toastStore.ts           # Toast уведомления
│
├── api/                        # Прямые вызовы Supabase
│   ├── auth.api.ts             # signIn, signOut, getUser
│   ├── cards.api.ts            # CRUD карточек
│   └── walls.api.ts            # CRUD стен
│
├── hooks/                      # React хуки
│   ├── useCardsSync.ts         # Загрузка карточек + autosave
│   ├── useWallsSync.ts         # Загрузка стен + CRUD с синком
│   ├── useBoard.ts             # Wheel zoom, pan, screenToCanvas
│   ├── useCapture.ts           # Paste/drop pipeline
│   ├── useDrag.ts              # Drag карточек
│   ├── useResize.ts            # Resize карточек
│   └── useVoiceRecorder.ts     # Запись голоса
│
├── features/
│   ├── board/
│   │   ├── Board.tsx           # Viewport + CSS transform canvas
│   │   └── DropZoneOverlay.tsx # Визуальный оверлей при drag-and-drop
│   ├── cards/
│   │   ├── CardShell.tsx       # Обёртка карточки (drag, resize, меню)
│   │   ├── TextCard.tsx        # Текстовая карточка
│   │   ├── ImageCard.tsx       # Карточка с изображением
│   │   ├── LinkCard.tsx        # Ссылка с превью
│   │   └── VoiceCard.tsx       # Голосовая заметка
│   ├── sidebar/
│   │   └── WallSidebar.tsx     # Сайдбар со списком стен
│   └── quick-add/
│       └── QuickAddButton.tsx  # FAB кнопка + попап создания
│
├── components/
│   ├── AnonBanner.tsx          # Баннер для анонимных пользователей
│   ├── AutosaveIndicator.tsx   # Индикатор сохранения
│   ├── ErrorBoundary.tsx       # React error boundary
│   └── ToastStack.tsx          # Toast уведомления UI
│
└── pages/
    ├── WallPage.tsx            # Страница стены (sidebar + board)
    └── WallListPage.tsx        # УСТАРЕЛО — не используется
```

---

## Типы карточек
```typescript
type Card = TextCard | ImageCard | LinkCard | VoiceCard
```

| Тип | Описание | Хранение контента |
|-----|----------|-------------------|
| `text` | Текстовая заметка | `content.content: string` |
| `image` | Изображение | `content.dataUrl: string` (base64) |
| `link` | Ссылка с превью | `content.url, title, ogImageUrl...` |
| `voice` | Голосовая заметка | `content.audioDataUrl: string` (base64) |

Все карточки хранятся в одной таблице `cards` в Supabase. Тип-специфичный контент — в JSONB колонке `content`.

---

## База данных

### Таблицы
- `walls` — стены пользователя
- `cards` — карточки (все типы в одной таблице)

### RLS политики
Все таблицы защищены Row Level Security — пользователь видит только свои данные (`auth.uid() = user_id`).

### Схема cards
```sql
id, wall_id, user_id, type, x, y, width, height, 
z_index, rotation, content (jsonb), color_hex,
created_at, updated_at
```

---

## Ключевые флоу

### Capture (вставка контента)
```
Paste/Drop событие
  → useCapture.ts
  → определяем тип (image/url/text)
  → cardsStore.create*Card() — добавляем в стор
  → useCardsSync.ts — автоматически вставляет в Supabase
```

### Autosave
```
cardsStore изменился
  → useCardsSync подписан через zustand.subscribe
  → debounce 600ms (позиция) / 1000ms (контент)
  → patchCard*() → Supabase UPDATE
```

### Drag карточки
```
MouseDown на CardShell
  → useDrag.ts
  → setDragPosition() — live позиция в dragPositions Map
  → MouseUp → commitDrag() — записывает в cards[]
  → autosave подхватывает изменение
```

### Камера (pan/zoom)
```
Wheel событие → useBoard.ts → boardStore.zoomBy/panBy
Space + drag → pan
CSS transform: translate(x,y) scale(zoom) на canvas div
```

---

## Auth флоу

### Текущий статус
- Google OAuth через Supabase
- Анонимные сессии включены (Supabase Anonymous Auth)
- **Известная проблема:** при reload анонимная сессия пересоздаётся с новым user_id → старые данные недоступны из-за RLS

### Планируемое решение
Анонимные данные хранить в localStorage, при авторизации мигрировать в Supabase.

---

## Переменные окружения
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## Локальный запуск
```bash
npm install
npm run dev
# Откроется на http://localhost:5173
```

---

## Известные ограничения (MVP)

1. **Images как base64** — изображения хранятся как base64 в Supabase JSONB. При большом количестве карточек с картинками БД раздуется. Нужно мигрировать на Supabase Storage.
2. **Анонимный reload** — при перезагрузке анонимная сессия пересоздаётся, данные теряются.
3. **Нет поиска** — поиск по карточкам запланирован.
4. **Нет шаринга** — публичные read-only ссылки запланированы.

---

## Роадмап

### P0 — текущий спринт
- [x] Фикс 404 при reload
- [x] Auto-fit карточек при входе
- [x] Sidebar со стенами
- [x] Меню карточки (три точки)
- [x] Удаление с подтверждением
- [x] Анонимный доступ (частично)
- [ ] Анонимный localStorage флоу
- [ ] Цвет карточек
- [ ] Поиск Cmd+F

### P1
- [ ] Supabase Storage для изображений
- [ ] Landing page
- [ ] Stripe монетизация

### P2
- [ ] Chrome плагин
- [ ] Мобильная версия (PWA)
- [ ] Шаринг стены

### P3
- [ ] Мобильное приложение
- [ ] Multi-select
