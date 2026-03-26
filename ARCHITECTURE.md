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
- **Деплой:** Vercel (через `npx vercel --prod`)
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
├── stores/
│   ├── authStore.ts                  # User, session, isAnonymous
│   ├── boardStore.ts                 # Камера (pan/zoom), selectedCardId, fitCards
│   ├── cardsStore.ts                 # Карточки, drag/resize, updateColor
│   ├── wallsStore.ts                 # Стены CRUD
│   └── toastStore.ts                 # Toast уведомления
│
├── api/
│   ├── auth.api.ts                   # signIn, signOut, getUser
│   ├── cards.api.ts                  # CRUD карточек
│   └── walls.api.ts                  # CRUD стен
│
├── hooks/
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
│   │   ├── CardShell.tsx             # Обёртка карточки (drag, resize, меню, цвет)
│   │   ├── TextCard.tsx              # Текстовая карточка с переносом строк
│   │   ├── ImageCard.tsx             # Карточка с изображением
│   │   ├── LinkCard.tsx              # Ссылка с превью (OG meta)
│   │   └── VoiceCard.tsx             # Голосовая заметка
│   ├── search/
│   │   └── GlobalSearch.tsx          # Глобальный поиск по всем стенам (Cmd+F / Cmd+K)
│   ├── sidebar/
│   │   └── WallSidebar.tsx           # Sidebar со стенами, профилем, поиском
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
    └── WallPage.tsx                  # Страница стены (sidebar + board + search)
```

---

## Типы карточек

| Тип | Описание | Хранение контента |
|-----|----------|-------------------|
| `text` | Текстовая заметка | `content.content: string` |
| `image` | Изображение | `content.dataUrl: string` (base64) |
| `link` | Ссылка с превью | `content.url, title, ogImageUrl...` |
| `voice` | Голосовая заметка | `content.audioDataUrl: string` (base64) |

Все карточки хранятся в одной таблице `cards`. Тип-специфичный контент — в JSONB колонке `content`. Цвет карточки — в колонке `color_hex`.

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
- `useWallsSync` и `useCardsSync` определяют режим через `getIsAnon()`
- При создании стены — предлагаем войти через Google
- Последняя стена сохраняется в `stena:lastWallId`

**Авторизованный пользователь:**
- Данные в Supabase
- Google OAuth через Supabase Auth
- Сессия живёт бессрочно (autoRefreshToken: true)

### Миграция при логине
При событии `SIGNED_IN` в `App.tsx`:
1. Проверяем есть ли данные в localStorage (`localHasData()`)
2. Если аккаунт пустой → вставляем стены и карточки как есть
3. Если аккаунт не пустой → создаём стену "Новые" и кладём туда все карточки
4. Очищаем localStorage
5. Защита от двойной миграции: `stena:migrated:{userId}`

---

## Ключевые флоу

### Capture
```
Paste/Drop → useCapture.ts → определяем тип
→ cardsStore.create*Card()
→ useCardsSync → localStorage (аноним) или Supabase (авторизован)
```

### Autosave
```
cardsStore изменился → useCardsSync.subscribe
→ getIsAnon() → localStorage или Supabase debounce 600ms
```

### Глобальный поиск
```
Cmd+F / Cmd+K / кнопка в sidebar
→ GlobalSearch.tsx оверлей
→ фильтрация по всем cards в сторе (текст, ссылки, голос, имя файла)
→ клик на результат → navigate + selectCard + setCamera (зум на карточку)
```

### Auto-fit камеры
```
Карточки загружены → boardStore.fitCards()
→ bounding box всех карточек → zoom + позиция
→ кнопка ⊡ вызывает то же вручную
```

### Цвет карточек
```
Три точки меню → палитра 7 цветов
→ cardsStore.updateColor() → card.colorHex
→ autosave сохраняет в Supabase / localStorage
```

---

## Деплой

Проект деплоится через Vercel CLI напрямую (не через GitHub Actions из-за кэш-проблем):
```bash
npm run build          # проверить локально
npx vercel --prod      # задеплоить в продакшн
```

GitHub push нужен для истории кода:
```bash
git add .
git commit -m "feat: ..."
git push
npx vercel --prod
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
# http://localhost:5173
```

---

## Известные ограничения

1. **Images как base64** — нужно мигрировать на Supabase Storage
2. **Нет шаринга** — публичные read-only ссылки запланированы
3. **Нет Stripe** — монетизация запланирована

---

## Роадмап

### ✅ P0 — Сделано
- Фикс 404 при reload
- Auto-fit карточек при входе
- Sidebar (ChatGPT стиль, скрываемый)
- Поиск по стенам в sidebar
- Глобальный поиск Cmd+F по всем стенам
- Три точки меню на карточке
- Цвет карточек (7 цветов)
- Удаление с подтверждением
- Перенос строк в текстовых карточках
- Анонимный режим (localStorage, 3 дня)
- Миграция данных анонима → Supabase при логине
- Убран топбар, убрана страница списка стен
- Сразу открывается последняя стена

### P1 — Следующий спринт
- [ ] Supabase Storage для изображений
- [ ] Landing page
- [ ] Первые пользователи
- [ ] Stripe монетизация

### P2
- [ ] Chrome плагин
- [ ] Мобильная версия (PWA)
- [ ] Шаринг стены (read-only)
- [ ] Alt-копирование карточек
- [ ] Перемещение между стенами
- [ ] Экспорт в PNG

### P3
- [ ] Мобильное приложение
- [ ] Multi-select
- [ ] Сортировка карточек
