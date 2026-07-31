# Retired monolith frontend

This app is **retired**. Use the split frontends:

| App | Folder | Port | Script |
|-----|--------|------|--------|
| Customer | `frontend-customer/` | 5173 | `npm run dev:customer` |
| Shop | `frontend-shop/` | 5174 | `npm run dev:shop` |
| Driver | `frontend-driver/` | 5175 | `npm run dev:driver` |

This folder is no longer an npm workspace package. You can delete it once you confirm the three apps work.
