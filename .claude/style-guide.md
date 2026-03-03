# PollCraft Style Guide

Uses **shadcn/ui default theme** — do not introduce custom color values. Always reference the CSS variables below via Tailwind semantic classes.

---

## Color Tokens

shadcn/ui exposes all colors as CSS variables in `globals.css`. Use them via Tailwind semantic classes — never hardcode hex or HSL values directly.

### Core Semantic Colors

| Token | Tailwind Class | Usage |
|-------|---------------|-------|
| `--background` | `bg-background` | Page background |
| `--foreground` | `text-foreground` | Primary body text |
| `--card` | `bg-card` | Card/panel backgrounds |
| `--card-foreground` | `text-card-foreground` | Text inside cards |
| `--popover` | `bg-popover` | Dropdowns, tooltips |
| `--popover-foreground` | `text-popover-foreground` | Text in popovers |
| `--primary` | `bg-primary` / `text-primary` | Primary buttons, key actions |
| `--primary-foreground` | `text-primary-foreground` | Text on primary backgrounds |
| `--secondary` | `bg-secondary` / `text-secondary` | Secondary buttons, badges |
| `--secondary-foreground` | `text-secondary-foreground` | Text on secondary backgrounds |
| `--muted` | `bg-muted` / `text-muted` | Disabled states, placeholder areas |
| `--muted-foreground` | `text-muted-foreground` | Secondary/helper text |
| `--accent` | `bg-accent` / `text-accent` | Hover states, subtle highlights |
| `--accent-foreground` | `text-accent-foreground` | Text on accent backgrounds |
| `--destructive` | `bg-destructive` / `text-destructive` | Error states, delete actions |
| `--destructive-foreground` | `text-destructive-foreground` | Text on destructive backgrounds |
| `--border` | `border-border` | Borders and dividers |
| `--input` | `border-input` | Form input borders |
| `--ring` | `ring-ring` | Focus rings |

### Status Colors (use Tailwind semantic classes)

| State | Background | Text | Usage |
|-------|-----------|------|-------|
| Success | `bg-primary` | `text-primary-foreground` | Successful vote submission |
| Error | `bg-destructive` | `text-destructive-foreground` | Validation errors, vote rejected |
| Muted/Disabled | `bg-muted` | `text-muted-foreground` | Expired polls, already-voted state |
| Info | `bg-secondary` | `text-secondary-foreground` | Informational badges |

---

## Usage Rules

1. **Never hardcode colors** — always use semantic Tailwind classes backed by CSS variables
   ```tsx
   // ✅ correct
   <p className="text-muted-foreground">Helper text</p>

   // ❌ wrong
   <p className="text-gray-500">Helper text</p>
   ```

2. **Dark mode is handled automatically** — shadcn/ui CSS variables switch on `class="dark"`. Do not write `dark:` variants for colors; use the semantic classes and they adapt.

3. **Use `cn()` for conditional classes** — import from `lib/utils.ts`
   ```tsx
   import { cn } from "@/lib/utils"

   <div className={cn("bg-card", isExpired && "bg-muted")} />
   ```

4. **Results bar chart colors** — use `bg-primary` for the filled bar and `bg-muted` for the empty track. Do not introduce chart-specific colors.

---

## Adding New CSS Variables

If a new token is ever needed, add it to `globals.css` following the existing HSL pattern:

```css
:root {
  --my-token: 220 14% 96%;
}
.dark {
  --my-token: 220 14% 10%;
}
```

Then extend `tailwind.config.ts`:

```ts
theme: {
  extend: {
    colors: {
      "my-token": "hsl(var(--my-token))",
    },
  },
},
```

---

## Reference

- shadcn/ui theming docs: https://ui.shadcn.com/docs/theming
- CSS variables are defined in `app/globals.css`
