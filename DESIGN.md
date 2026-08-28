# DESIGN.md - Saloes App Design System

## Project Overview
Sistema de gestao para saloes de beleza (Salon Management System). Multi-tenant SaaS application with role-based access control.

## Tech Stack
- **Frontend:** React 18 + Vite 6
- **Styling:** Tailwind CSS 3 + shadcn/ui (New York style)
- **Components:** Radix UI primitives
- **Icons:** Lucide React
- **Animations:** Framer Motion + Tailwind CSS animations
- **Backend:** Supabase (PostgreSQL + Auth + RLS)

## Brand Colors
```
Primary:    #C8A97E (Warm gold)
Secondary:  #1A1A1A (Near black)
Accent:     #B8956A (Darker gold)
Background: #0F0F0F (Dark background)
```

## Color Palette (Surface)
```
50:  #F8FAFC
100: #F1F5F9
200: #E2E8F0
300: #CBD5E1
400: #94A3B8
500: #64748B
600: #475569
700: #334155
800: #1E293B
900: #0F172A
950: #020617
```

## Typography
- **Font Family:** Inter, system-ui, -apple-system, sans-serif
- **Display Font:** Inter (same as body, for consistency)
- **Letter Spacing:** -0.025em for headings
- **Font Features:** "cv11", "ss01", "ss03" (contextual alternates, stylistic sets)

## Border Radius
```
Default: 0.75rem (--radius)
Large:   0.75rem
Medium:  calc(0.75rem - 2px)
Small:   calc(0.75rem - 4px)
2xl:     1rem
3xl:     1.5rem
```

## Shadows
```
Card:       0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)
Card Hover: 0 10px 25px -5px rgba(0,0,0,0.08), 0 4px 10px -5px rgba(0,0,0,0.04)
Sidebar:    4px 0 24px rgba(0,0,0,0.04)
Glow:       0 0 20px rgba(var(--branding-primary) / 0.15)
```

## Component Patterns

### Cards
- Background: white (light) / hsl(240 6% 12%) (dark)
- Border: 1px solid hsl(var(--border))
- Border Radius: var(--radius) = 0.75rem
- Shadow: shadow-card
- Hover: translateY(-2px) + shadow-card-hover

### Buttons
- Primary: Brand gradient (primary to secondary)
- Default: shadcn/ui Button component
- Variants: default, destructive, outline, secondary, ghost, link

### Forms
- Input border: hsl(var(--input))
- Focus ring: 2px solid var(--primary)
- Error state: destructive color

## Animations
```
Accordion Down: height 0 -> var(--radix-accordion-content-height)
Accordion Up:   height var(--radix-accordion-content-height) -> 0
Fade In:        opacity 0 + translateY(8px) -> opacity 1 + translateY(0)
Slide Up:       opacity 0 + translateY(16px) -> opacity 1 + translateY(0)
Scale In:       opacity 0 + scale(0.95) -> opacity 1 + scale(1)
```

## Layout Structure
- **Sidebar:** Fixed left sidebar with navigation
- **Main Content:** Scrollable content area
- **Header:** Top navigation bar
- **Cards:** Used for data display (customers, services, appointments)

## Dark Mode Support
- Class-based dark mode (`.dark` class on html/body)
- Full color scheme inversion
- Shadow adjustments for dark backgrounds

## Glass Effect
```css
backdrop-filter: blur(12px) saturate(180%);
-webkit-backdrop-filter: blur(12px) saturate(180%);
```

## User Roles
- `super_admin`: Full system access
- `admin`: Company management
- `profissional`: Limited access (schedules, customers)

## Multi-tenancy
- Companies have their own branding (colors, logo, name)
- Data isolation via Row-Level Security (RLS)
- Dynamic theme application based on company settings

## Pages (22 total)
- Dashboard, Calendar/Schedule, Customers, Services
- Professionals, Invoices, Plans, Settings
- Login, Register, Password Reset
- Company Management, Templates, Waiting List

## Design Principles
1. **Clean & Professional:** Minimalist design with clear hierarchy
2. **Consistent:** Use shadcn/ui components throughout
3. **Responsive:** Mobile-first approach
4. **Accessible:** WCAG 2.1 AA compliance
5. **Fast:** Optimized animations, lazy loading
6. **Branded:** Dynamic theming per company
