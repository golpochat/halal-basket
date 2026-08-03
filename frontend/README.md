# Retired monolith frontend

This app is **retired**. **Do not use, run, or develop this frontend.** Use the split frontends:

| App | Folder | Port | Script |
|-----|--------|------|--------|
| Customer | `frontend-customer/` | 5173 | `npm run dev:customer` |
| Shop | `frontend-shop/` | 5174 | `npm run dev:shop` |
| Driver | `frontend-driver/` | 5175 | `npm run dev:driver` |
| Admin | `frontend-admin/` | 5176 | `npm run dev:admin` |

This folder is no longer an npm workspace package. You can delete it once you confirm the four apps work.
