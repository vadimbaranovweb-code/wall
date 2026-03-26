# Wall — Architecture Documentation
*Последнее обновление: 26 марта 2026*

## Что такое Wall
Инструмент для быстрого захвата мыслей, ссылок и изображений в виде карточек на свободной доске. Не whiteboard, не Notion — быстрый brain dump tool.

**Главный принцип:** Paste → карточка появилась → продолжаешь думать.

---

## Стек
- **Frontend:** React 18 + TypeScript + Vite
- **Стили:** Tailwind CSS
- **Стейт:** Zustand
- **База данных:** Supabase (PostgreSQL + Auth)
- **Деплой:** Vercel
- **ID генерация:** nanoid

---

## Структура проекта
```
src/
├── types/index.ts                    # Все TypeScript типы
├── lib/
│   ├── supabase.ts                   # Supabase клиент + типы DB строк
│   ├── mappers.ts                    # DB rows ↔ app types конвертация
│   ├── localStore.ts                 # localStorage для анонимных пользователей
│   ├── migrateAnonData.ts            # Миграция данных анонима → Supabase при логине
│   ├── cn.ts                         # clsx + tailwind-merge хелпер
│   ├── id.ts                         # nanoid wrapper
│   └── imageUtils.ts                 # Resize изображений, URL хелперы
│
├── stores/                           # Zustand stores (глобальный стейт)
│   ├── authStore.ts                  # User, session, isAnonymous
│   ├── boardStore.ts                 # Камера (pan/zoom), selectedCardId, fitCards
│   ├── cardsStore.ts                 # Карточки, drag/resize позиции
│   ├── wallsStore.ts                 # Стены CRUD
│   └── toastStore.ts                 # Toast уведомления
│
├── api/                              # Прямые вызовы Supabase
│   ├── auth.api.ts                   # signIn, signOut, getUser
│   ├── cards.api.ts                  # CRUD карточек
│   └── walls.api.ts                  # CRUD стен
│
├── hooks/                            # React хуки
│   ├── useCardsSync.ts               # Загрузка карточек + autosave (Supabase или localStorage)
│   ├── useWallsSync.ts               # Загрузка стен + CRUD (Supabase или localStorage)
│   ├── useBoard.ts                   # Wheel zoom, pan, screenToCanvas
│   ├── useCapture.ts                 # Paste/drop pipeline
│   ├── useDrag.ts                    # Drag карточек
│   ├── useResize.ts                  # Resize карточек
│   └── useVoiceRecorder.ts           # Запись голоса
│
├── features/
│   ├── board/
│   │   ├── Board.tsx                 # Viewport + CSS transform canvas + auto-fit
│   │   └── DropZoneOverlay.tsx       # Визуальный оверлей при drag-and-drop
│   ├── cards/
│   │   ├── CardShell.tsx             # Обёртка карточки (drag, resize, три точки меню)
│   │   ├── TextCard.tsx              # Текстовая карточка с переносом строк
│   │   ├── ImageCard.tsx             # Карточка с изображением
│   │   ├── LinkCard.tsx              # Ссылка с превью (OG meta)
│   │   └── VoiceCard.tsx             # Голосовая заметка
│   ├── sidebar/
│   │   └── WallSidebar.tsx           # Sidebar со стенами, поиском, профилем
│   └── quick-add/
│       └── QuickAddButton.tsx        # FAB кнопка + попап создания карточек
│
├── components/
│   ├── AnonBanner.tsx                # Баннер для анонимных пользователей
│   ├── AutosaveIndicator.tsx         # Индикатор сохранения
│   ├── ErrorBoundary.tsx             # React error boundary
│   └── ToastStack.tsx                # Toast уведомления UI
│
└── pages/
    └── WallPage.tsx                  # Страница стены (sidebar + board)
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

## Auth флоу

### Два режима работы

**Анонимный пользователь (без логина):**
- Данные хранятся в `localStorage` (ключи: `stena:anon:walls`, `stena:anon:cards`)
- TTL: 3 дня с момента последней активности
- `useWallsSync` и `useCardsSync` автоматически определяют режим через `getIsAnon()`
- При создании стены — предлагаем войти через Google

**Авторизованный пользователь:**
- Данные в Supabase
- Google OAuth через Supabase Auth
- Сессия живёт бессрочно (autoRefreshToken: true)

### Миграция при логине
При событии `SIGNED_IN` в `App.tsx`:
1. Проверяем есть ли данные в localStorage (`localHasData()`)
2. Если есть — вызываем `migrateAnonDataToSupabase()`
3. Если аккаунт пустой — вставляем стены и карточки как есть
4. Если аккаунт не пустой — создаём стену "Новые" и кладём туда все карточки
5. Очищаем localStorage
6. Защита от двойной миграции через ключ `stena:migrated:{userId}`

---

## Ключевые флоу

### Capture (вставка контента)
```
Paste/Drop событие
  → useCapture.ts
  → определяем тип (image/url/text)
  → cardsStore.create*Card() — добавляем в стор
  → useCardsSync.ts — автоматически сохраняет (localStorage или Supabase)
```

### Autosave
```
cardsStore изменился
  → useCardsSync подписан через zustand.subscribe
  → getIsAnon() определяет куда сохранять
  → Аноним: localSaveCard() сразу
  → Авторизован: debounce 600ms → patchCard*() → Supabase UPDATE
```

### Drag карточки
```
MouseDown на CardShell
  → useDrag.ts
  → setDragPosition() — live позиция в dragPositions Map
  → MouseUp → commitDrag() — записывает в cards[]
  → autosave подхватывает изменение
```

### Auto-fit камеры
```
Карточки загружены → Board.tsx useEffect
  → boardStore.fitCards(cards, viewportW, viewportH)
  → считает bounding box всех карточек
  → выставляет zoom и позицию чтобы все влезли
  → кнопка ⊡ вызывает то же самое вручную
```

### Навигация
```
Вход на сайт → App.tsx
  → Supabase проверяет сессию (authLoading)
  → Есть сессия → HomeRedirect → последняя стена из localStorage/Supabase
  → Нет сессии → HomeRedirect → данные из localStorage → та же стена
  → Нет данных → создаём "Моя стена" → открываем
```

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

1. **Images как base64** — изображения хранятся как base64 в Supabase JSONB. При большом количестве карточек с картинками БД раздуётся. Нужно мигрировать на Supabase Storage.
2. **Нет поиска по карточкам** — поиск Cmd+F запланирован.
3. **Нет шаринга** — публичные read-only ссылки запланированы.
4. **Нет цвета карточек** — запланировано.

---

## Роадмап

### ✅ Сделано
- Фикс 404 при reload (vercel.json)
- Auto-fit карточек при входе на стену
- Кнопка ⊡ вернуть все в экран
- Sidebar со стенами (скрываемый, ChatGPT стиль)
- Поиск по стенам в sidebar
- Три точки меню на карточке (удаление с подтверждением)
- Перенос строк в текстовых карточках
- Анонимный режим (localStorage, 3 дня)
- Баннер для анонимов с призывом войти
- Миграция данных анонима → Supabase при логине
- Убран топбар, убрана страница списка стен
- Сразу открывается последняя стена

### P0 — следующий спринт
- [ ] Цвет карточек
- [ ] Поиск Cmd+F по карточкам

### P1
- [ ] Supabase Storage для изображений
- [ ] Landing page
- [ ] Stripe монетизация

### P2
- [ ] Chrome плагин
- [ ] Мобильная версия (PWA)
- [ ] Шаринг стены (read-only ссылка)
- [ ] Alt-копирование карточек
- [ ] Перемещение карточек между стенами
- [ ] Экспорт в PNG

### P3
- [ ] Мобильное приложение
- [ ] Multi-select + выравнивание
- [ ] Сортировка карточек
