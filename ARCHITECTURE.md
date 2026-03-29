# Wall — Architecture Documentation
*Последнее обновление: 28 марта 2026*

## Что такое Wall
Инструмент для быстрого захвата мыслей, ссылок и изображений в виде карточек на свободной доске. Не whiteboard, не Notion — быстрый brain dump tool.

**Главный принцип:** Paste → карточка появилась → продолжаешь думать.

---

## Стек
- **Frontend:** React 18 + TypeScript + Vite
- **Стили:** Tailwind CSS
- **Стейт:** Zustand
- **База данных:** Supabase (PostgreSQL + Auth) — регион eu-west-1 (Ireland)
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
│   ├── boardStore.ts                 # Камера, selectedCardIds, мультиселект, fitCards
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
│   ├── useCardsSync.ts               # Загрузка карточек + autosave
│   ├── useWallsSync.ts               # Загрузка стен + CRUD
│   ├── useIsMobile.ts                # Определение мобильного устройства (< 768px)
│   ├── useBoard.ts                   # Wheel zoom, pan, screenToCanvas
│   ├── useCapture.ts                 # Paste/drop pipeline
│   ├── useDrag.ts                    # Drag карточек + групповой drag
│   ├── useResize.ts                  # Resize карточек
│   └── useVoiceRecorder.ts           # Запись голоса
│
├── features/
│   ├── board/
│   │   ├── Board.tsx                 # Viewport + canvas + auto-fit + drag selection
│   │   ├── MultiSelectToolbar.tsx    # Тулбар мультиселекта (выравнивание, сетка, удаление)
│   │   ├── SortPanel.tsx             # Сортировка и расстановка карточек
│   │   └── DropZoneOverlay.tsx       # Визуальный оверлей при drag-and-drop
│   ├── cards/
│   │   ├── CardShell.tsx             # Обёртка карточки (drag, resize, меню, цвет)
│   │   ├── TextCard.tsx              # Текстовая карточка
│   │   ├── ImageCard.tsx             # Карточка с изображением
│   │   ├── LinkCard.tsx              # Ссылка с превью (OG meta)
│   │   └── VoiceCard.tsx             # Голосовая заметка
│   ├── mobile/
│   │   └── MobileBoard.tsx           # Мобильный layout (лента + action sheet + sidebar)
│   ├── search/
│   │   └── GlobalSearch.tsx          # Глобальный поиск Cmd+F / Cmd+K
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
    └── WallPage.tsx                  # Страница стены — десктоп или мобильный layout
```

---

## Типы карточек

| Тип | Описание | Хранение контента |
|-----|----------|-------------------|
| `text` | Текстовая заметка | `content.content: string` |
| `image` | Изображение | `content.dataUrl: string` (base64) |
| `link` | Ссылка с превью | `content.url, title, ogImageUrl...` |
| `voice` | Голосовая заметка | `content.audioDataUrl: string` (base64) |

Все карточки в одной таблице `cards`. Тип-специфичный контент — в JSONB колонке `content`. Цвет — в `color_hex`.

---

## База данных

### Таблицы
- `walls` — стены пользователя
- `cards` — карточки (все типы в одной таблице)

### RLS политики
Все таблицы защищены Row Level Security — пользователь видит только свои данные.

### Схема cards
```sql
id, wall_id, user_id, type, x, y, width, height,
z_index, rotation, content (jsonb), color_hex,
created_at, updated_at
```

---

## Auth флоу

### Два режима работы

**Анонимный пользователь:**
- Данные в `localStorage` (ключи: `stena:anon:walls`, `stena:anon:cards`)
- TTL: 3 дня
- При создании стены → предлагаем войти через Google

**Авторизованный пользователь:**
- Данные в Supabase
- Google OAuth
- Сессия живёт бессрочно

### Миграция при логине
При `SIGNED_IN` в `App.tsx`:
1. Проверяем localStorage (`localHasData()`)
2. Аккаунт пустой → вставляем как есть
3. Аккаунт не пустой → создаём стену "Новые"
4. Очищаем localStorage
5. Защита от двойной миграции: `stena:migrated:{userId}`

---

## Мобильная версия

Автодетект через `useIsMobile()` (< 768px) → рендерим `MobileBoard` вместо десктопного `Board`.

### MobileBoard features
- Лента карточек (новые сверху)
- Поле ввода внизу — текст или ссылка
- Кнопка `+` → action sheet:
  - Вставить из буфера
  - Фото из галереи
  - Голосовая заметка
- Микрофон → запись голоса прямо из таббара
- Гамбургер → мобильный sidebar со стенами
- PWA манифест — можно установить на экран

---

## Мультиселект

- **Shift + клик** — добавить/убрать карточку
- **Drag по холсту** — резиновое выделение
- **Drag выделенных** — все двигаются вместе
- **Тулбар** при 2+ выделенных:
  - Выравнивание (6 направлений)
  - Расставить по сетке
  - Удаление группой

---

## Сортировка и расстановка

Кнопка "Сортировка" внизу справа:
- По дате создания / изменения → сетка
- По типу → строками или столбиками
- Расставить всё: сетка / столбик / строка

---

## Глобальный поиск

`Cmd+F` / `Cmd+K` / кнопка в sidebar:
- Поиск по всем стенам и всем типам карточек
- Результаты в реальном времени
- Клик → navigate + zoom на карточку
- Навигация `↑↓`, выбор `Enter`, закрыть `Esc`

---

## Цвет карточек

Три точки → палитра 7 цветов → `card.colorHex` → autosave.

---

## Деплой
```bash
npm run build          # проверить локально
npx vercel --prod      # задеплоить
git add . && git commit -m "..." && git push  # история в GitHub
```

---

## Переменные окружения
```env
VITE_SUPABASE_URL=https://qjbxopyglyagbuodrwov.supabase.co
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

1. **Images как base64** — нужно мигрировать на Supabase Storage при росте
2. **Нет шаринга** — публичные read-only ссылки запланированы
3. **Нет Stripe** — монетизация запланирована
4. **Supabase может блокироваться** у некоторых провайдеров СНГ без VPN

---

## Роадмап

### ✅ Сделано
- Фикс 404 при reload
- Auto-fit карточек
- Sidebar (ChatGPT стиль)
- Глобальный поиск Cmd+F
- Цвет карточек (7 цветов)
- Мультиселект + выравнивание
- Сортировка и расстановка
- Анонимный режим (localStorage)
- Миграция данных при логине
- Мобильная версия (PWA)
- Голосовые заметки на мобильном

### P1 — Запуск
- [ ] UI правки (мобиль + десктоп)
- [ ] Landing page
- [ ] Первые пользователи

### P2 — Монетизация
- [ ] Stripe
- [ ] Free tier ограничения (3 стены, 50 карточек)

### P3 — Рост
- [ ] Chrome плагин
- [ ] Share стены (read-only)
- [ ] Экспорт в PNG
- [ ] Supabase Storage для изображений
- [ ] Alt-копирование карточек

### P4 — Масштаб
- [ ] Мобильное приложение iOS/Android
- [ ] Коллаборация
- [ ] API
- [ ] i18n
