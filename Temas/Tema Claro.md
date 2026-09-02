---
name: Lux-Management Aesthetics
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#594047'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f1f1'
  outline: '#8d6f77'
  outline-variant: '#e1bec6'
  surface-tint: '#ba0060'
  primary: '#b7005e'
  on-primary: '#ffffff'
  primary-container: '#db2777'
  on-primary-container: '#fffdff'
  inverse-primary: '#ffb1c7'
  secondary: '#635c61'
  on-secondary: '#ffffff'
  secondary-container: '#e7dde3'
  on-secondary-container: '#686066'
  tertiary: '#605b5e'
  on-tertiary: '#ffffff'
  tertiary-container: '#797476'
  on-tertiary-container: '#fffdff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffd9e2'
  primary-fixed-dim: '#ffb1c7'
  on-primary-fixed: '#3f001c'
  on-primary-fixed-variant: '#8e0048'
  secondary-fixed: '#eae0e6'
  secondary-fixed-dim: '#cec4ca'
  on-secondary-fixed: '#1f1a1e'
  on-secondary-fixed-variant: '#4b454a'
  tertiary-fixed: '#e8e1e3'
  tertiary-fixed-dim: '#ccc5c7'
  on-tertiary-fixed: '#1e1b1d'
  on-tertiary-fixed-variant: '#4a4648'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 24px
  margin: 32px
---

## Brand & Style
The design system for this beauty salon management platform is built on a foundation of **Modern SaaS** principles, blending high-end editorial aesthetics with functional clarity. It targets professional salon owners and staff, evoking a sense of precision, cleanliness, and effortless luxury.

The style leverages **Minimalism** with a focus on tactile high-contrast accents. It uses generous whitespace to prevent information density from feeling overwhelming, while the specific use of the primary pink accent creates a signature "Vip" atmosphere. Surfaces are organized through clear containment and logical nesting, ensuring the tool feels as sophisticated as the services it manages.

## Colors
The palette is centered around a vibrant **#DB2777 Primary Pink**, used purposefully for actions and brand identity. 

- **Surface & Backgrounds**: The main workspace utilizes `#F5F5F5` as the foundation. Inner containers and cards transition to pure `#FFFFFF` to create a tiered visual hierarchy.
- **Sidebar**: To meet the requirement for a professional high-end look with white text, the sidebar utilizes a deep **#1E1B1D Charcoal**, providing the necessary contrast for the `#FFFFFF` navigation labels.
- **Accents**: `#FDF2F8` is used as a secondary wash for subtle backgrounds, hover states, or soft sectioning where the deep charcoal is too heavy.
- **Semantic Colors**: Success (green), Warning (amber), and Error (red) should follow standard SaaS conventions but with adjusted saturation to match the primary pink’s intensity.

## Typography
**Inter** is the sole typeface, chosen for its exceptional legibility in data-heavy management interfaces. 

The type scale emphasizes a clear distinction between "Reading" (Body) and "Data Points" (Labels). Use `label-md` for table headers and small metadata, ensuring the uppercase styling provides enough contrast against body text. Line heights are kept generous (1.4x to 1.5x) to maintain the airy, professional feel of a modern salon workspace. For mobile, decrease headline sizes to avoid awkward wrapping in tight scheduling views.

## Layout & Spacing
This design system employs a **12-column fluid grid** for the main content area with a fixed-width sidebar (280px). 

- **Sidebar**: High-contrast dark background with white text. Top-aligned navigation icons and labels.
- **Rhythm**: A 4px base unit controls all padding and margins. 
- **Margins**: Use `32px` page margins on desktop to create a premium, uncrowded look.
- **Breakpoints**: 
  - Mobile (<768px): 4-column grid, 16px margins, sidebar collapses to a hamburger menu.
  - Tablet (768px - 1024px): 8-column grid, 24px margins.
  - Desktop (>1024px): 12-column grid, 32px margins.

## Elevation & Depth
Depth is created through a mix of **Tonal Layers** and **Subtle SaaS Shadows**.

- **Level 0**: Background (`#F5F5F5`).
- **Level 1 (Cards)**: White background with a 1px border (`#E5E5E5`) or a soft shadow (0px 4px 12px rgba(0,0,0,0.05)).
- **Level 2 (Dropdowns/Modals)**: White background with a more pronounced shadow (0px 10px 25px rgba(0,0,0,0.1)) to indicate clear separation from the workspace.
- **Sidebar**: Uses depth through color contrast rather than shadow, staying flat against the left edge to anchor the UI.

## Shapes
The shape language is friendly yet professional.
- **Standard Radius**: 12px (`rounded-xl`) is applied to all primary containers, cards, and input fields.
- **Buttons**: Should match the 12px radius to maintain consistency.
- **Chips/Badges**: Use a fully pill-shaped radius (999px) for status indicators to distinguish them from interactive buttons.
- **Icons**: Utilize a 2px stroke weight with slightly rounded terminals to complement the Inter typeface.

## Components

- **Primary Button**: Background `#DB2777`, Text `#FFFFFF`, Weight 600. 12px corner radius. High-contrast and clear.
- **Stat Cards**: Pure white background (`#FFFFFF`) with a 12px radius. Must feature a `4px` solid left border in `#DB2777` to signify importance and brand alignment.
- **Active Navigation**: Within the dark sidebar, active items feature a `4px` left border in `#DB2777` and a background tint of `#DB277720` (pink at 12% opacity) to highlight the current selection without overwhelming the dark theme.
- **Input Fields**: White background with a 1px `#D1D5DB` border, transitioning to a 2px `#DB2777` border on focus.
- **Data Tables**: Clean, borderless rows with a subtle `#F9FAFB` zebra stripe or hover state. Headers use `label-md` for high scannability.
- **Calendar/Scheduler**: The heart of the SaaS. Use light pink `#FDF2F8` for blocked time slots and solid `#DB2777` for confirmed appointments.