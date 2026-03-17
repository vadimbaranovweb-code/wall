# Стена — MVP

Визуальная доска для быстрого захвата мыслей. Текстовые карточки, свободное перемещение, бесконечный холст.

## Быстрый старт

```bash
npm install
npm run dev
```

Откроется на http://localhost:5173

## Структура проекта

```
src/
├── types/index.ts                 # Все TypeScript типы
├── lib/
│   ├── cn.ts                      # clsx + tailwind-merge
│   └── id.ts                      # nanoid wrapper
│
├── stores/
│   ├── boardStore.ts              # Camera (pan/zoom), selectedCardId
│   ├── cardsStore.ts              # Map<id,Card>, drag/resize live positions
│   └── wallsStore.ts              # Walls CRUD, persisted to localStorage
│
├── hooks/
│   ├── useBoard.ts                # Wheel zoom, alt+drag pan, screenToCanvas()
│   ├── useDrag.ts                 # Mouse drag with window listeners
│   └── useResize.ts               # Resize handle logic
│
├── features/
│   ├── board/Board.tsx            # Viewport + CSS transform canvas + HUD
│   ├── cards/TextCard.tsx         # Card: drag, resize, inline edit
│   └── quick-add/QuickAddButton.tsx  # FAB + popup + hotkey N
│
└── pages/
    ├── WallListPage.tsx           # Grid of walls, create/rename/delete
    └── WallPage.tsx               # Topbar + Board + global hotkeys
```

## Хоткеи

| Клавиша | Действие |
|---------|----------|
| `N` | Новая текстовая карточка |
| `Dbl click` на холсте | Создать карточку под курсором |
| `Delete` / `Backspace` | Удалить выделенную карточку |
| `Escape` | Снять выделение / выйти из редактирования |
| `Cmd/Ctrl + Enter` | Сохранить текст карточки |
| `Alt + drag` | Перемещение холста (pan) |
| Колёсико | Масштаб к курсору |
| `Ctrl+0` | Сбросить камеру (100%, центр) |

## Как добавить новый тип карточки

### 1. Добавить тип в `src/types/index.ts`

```ts
export type CardType = 'text' | 'image'  // добавить 'image'

export interface ImageCard extends CardBase {
  type: 'image'
  storageKey: string
  widthPx?: number
  heightPx?: number
}

export type Card = TextCard | ImageCard   // добавить в union
```

### 2. Создать компонент `src/features/cards/ImageCard.tsx`

```tsx
export function ImageCard({ card }: { card: ImageCard }) {
  // ... рендер карточки
}
```

### 3. Добавить в роутер карточек в `Board.tsx`

```tsx
function CardRenderer({ card }: { card: Card }) {
  switch (card.type) {
    case 'text':  return <TextCard  card={card} />
    case 'image': return <ImageCard card={card} />  // ← добавить
    default:      return null
  }
}
```

### 4. Добавить создание в `cardsStore.ts`

```ts
createImageCard: (wallId, x, y, storageKey) => {
  const card: ImageCard = {
    id: newId(), wallId, type: 'image',
    storageKey, x, y, width: 280, height: 200,
    zIndex: get().maxZIndex(wallId) + 1,
    rotation: 0, createdAt: Date.now(), updatedAt: Date.now(),
  }
  set(s => ({ cards: [...s.cards, card] }))
  return card
}
```

### 5. Включить кнопку в `QuickAddButton.tsx`

```tsx
<TypeButton icon="🖼" label="Фото" onClick={addImageCard} />  // убрать disabled
```

## Подключение Supabase (следующий шаг)

```bash
npm install @supabase/supabase-js
```

1. Создать `src/lib/supabase.ts` с `createClient(url, key)`
2. Заменить `persist` в stores на прямые вызовы Supabase
3. Добавить Row Level Security на таблицы `walls` и `cards`
4. Storage bucket `files` для загрузки изображений / аудио

## Производительность

При 300+ карточках включить culling в `Board.tsx`:

```ts
// hooks/useVisibleCards.ts — рендерить только видимые карточки
const BUFFER = 200
const visible = cards.filter(c =>
  c.x < vx2 + BUFFER && c.x + c.width  > vx1 - BUFFER &&
  c.y < vy2 + BUFFER && c.y + c.height > vy1 - BUFFER
)
```
