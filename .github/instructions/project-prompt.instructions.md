---
applyTo: '**'
---

# Generate VulnTrack Frontend with Coal Series

You are an expert full-stack engineer specializing in **Next.js (App Router)**, **TypeScript**, **TailwindCSS**, and **design system integration**.

I already have a **backend API** running at `http://localhost:3000/api`.  
The API endpoints are documented in `BACKEND_ENDPOINTS.md` at the project root.  

I have cloned the **Coal Series design system** into this repo under `/packages`:
- `/packages/tailwind-preset`
- `/packages/react-components`

⚠️ **Important**: These are **reference-only** packages.  
Do NOT import directly from `/packages`.  
Instead, **copy the relevant styles and component logic** into this project’s `/components` and `/styles` folders.  
This keeps the VulnTrack frontend **self-contained** and avoids dependency issues.  

---

## Requirements

### 1. Framework & Setup
- Use **Next.js (App Router)** with TypeScript.
- Extend `tailwind.config.ts` with Coal Series colors, typography, spacing, shadows (see `/packages/tailwind-preset`).
- Place reusable components in `/components`.

### 2. App Layout
- Sidebar navigation with: Command Center, Device Inventory, Vulnerability Radar, Scan Automation, Reports, Settings.
- Top bar for actions (export, start scan, profile dropdown).
- Use **Coal Series visual identity**: black/white foundation, electric blue accent.

### 3. Pages
- `/login`: Login form → POST `/api/auth/login`, store JWT in cookies or localStorage.
- `/dashboard`: Stats cards, vulnerability queue table, radar + heatmap placeholder.
- `/devices`: Device management table with add/remove device → `/tenants/{id}/devices`.
- `/users`: Manage collaborators → add/list/remove.
- `/subscription`: Show plan + simulate changes.

### 4. Auth
- Store token as `Authorization: Bearer {{TOKEN}}`.
- Redirect to `/dashboard` if logged in, `/login` otherwise.
- Middleware/HOC for route protection.

### 5. API Integration
- Implement `/lib/api.ts` with typed helper functions (login, getDevices, addDevice, etc.).
- Always inject token header automatically.

### 6. UI
- Create **CoalCard, CoalButton, CoalTable, CoalSidebar** in `/components` (reference `/packages/react-components`).
- Use severity/status badges: Critical, High, Warning, Info.
- Electric blue accent for primary actions.

### 7. Developer Experience
- Build hooks for data fetching (`useDevices`, `useUsers`, etc.).
- Handle loading + error states.
- Keep code modular and clean.

---

## Design System Reference

- **Reference Tailwind preset**: [Coal Tailwind Preset](./packages/tailwind-preset)  
- **Reference React components**: [Coal React Components](./packages/react-components)  

Use these packages **only for guidance**.  
The final VulnTrack frontend must be **self-contained** with hardcoded Coal Series styles and components.

---

👉 **Your job**: Scaffold the complete Next.js frontend with all pages, authentication, API integration, and UI using the Coal Series style.  
Follow the API contract from `BACKEND_ENDPOINTS.md`.  
All UI components must be recreated in `/components`, not imported from `/packages`.
