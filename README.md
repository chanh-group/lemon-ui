# LemonChat

Ứng dụng nhắn tin an toàn (light mode, tiếng Việt) — React 19 + Vite + Tailwind CSS 4 + shadcn/ui.

## Chạy dự án

```bash
bun install
bun run dev
```

## Scripts

| Lệnh | Mô tả |
|-------|--------|
| `bun run dev` | Chạy dev server |
| `bun run build` | Build production |
| `bun run lint` | Chạy oxlint |
| `bun run preview` | Xem trước bản build |

## Cấu trúc thư mục

```
src/
├── app/            # App shell, router, providers, globals.css
├── assets/         # images / icons / fonts
├── components/     # ui (shadcn) / layout / common
├── features/       # auth, users, dashboard... (api, components, hooks, schemas, types)
├── pages/          # LoginPage, RegisterPage, DashboardPage, NotFoundPage
├── hooks/          # useDebounce, useMediaQuery
├── lib/            # api, query-client, storage, utils
├── config/         # env, constants
└── types/          # api, common
```

## Design tokens

- Màu chủ đạo: vàng chanh (lemon) + xanh lá chanh (lime), light mode only
- Font: Be Vietnam Pro (tiêu đề) + Noto Sans (nội dung)
- Bo tròn tối giản (`--radius: 0.25rem`), type scale dùng `clamp()` — không hardcode px
