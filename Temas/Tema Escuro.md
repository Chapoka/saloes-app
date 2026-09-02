---
name: Obsidian & Gold
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#d6c3af'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#9e8e7c'
  outline-variant: '#514535'
  surface-tint: '#ffb956'
  primary: '#ffca85'
  on-primary: '#452b00'
  primary-container: '#f2a93b'
  on-primary-container: '#664000'
  inverse-primary: '#835400'
  secondary: '#c8c6c5'
  on-secondary: '#303030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b4'
  tertiary: '#d3d2dc'
  on-tertiary: '#2f3037'
  tertiary-container: '#b7b7c0'
  on-tertiary-container: '#474850'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffddb5'
  primary-fixed-dim: '#ffb956'
  on-primary-fixed: '#2a1800'
  on-primary-fixed-variant: '#633f00'
  secondary-fixed: '#e4e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#e2e1eb'
  tertiary-fixed-dim: '#c6c6cf'
  on-tertiary-fixed: '#1a1b22'
  on-tertiary-fixed-variant: '#45464e'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  headline-xl:
    fontFamily: Manrope
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.08em
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
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

This design system embodies a premium, high-end grooming and professional service aesthetic. The personality is sophisticated, masculine, and authoritative, drawing inspiration from modern luxury barbershops. 

The visual style is **Corporate / Modern** with a touch of **Minimalism**. It utilizes a "dark mode first" philosophy to create an atmosphere of exclusivity and focus. The interface relies on deep, obsidian surfaces contrasted against sharp white typography and vibrant amber accents to guide the user through complex management tasks with clarity and elegance. The emotional response is one of trust, precision, and high-quality craftsmanship.

## Colors

The palette is anchored by **Obsidian (#121212)**, providing a deep, non-distracting background that makes content pop. 

- **Primary (Amber Gold):** Used exclusively for primary actions, active states, and critical branding elements. It should be used sparingly to maintain its impact.
- **Secondary (Coal):** Used for surface containers, cards, and input fields to create subtle depth against the obsidian base.
- **Neutral (Zinc):** A range of greys used for secondary text, icons, and borders.
- **High-Contrast White:** Pure or near-white (#FFFFFF or #FAFAFA) is used for primary headings and body text to ensure maximum readability against the dark backdrop.

## Typography

The system utilizes **Manrope** for all primary interface text. Its geometric yet warm characteristics provide a modern, professional look that is highly legible in dark mode environments. 

For technical details, tags, and administrative labels, **JetBrains Mono** is used to introduce a precise, "instrument-panel" feel that reinforces the management aspect of the product. 

- Use **Bold (700)** for primary headings to establish clear hierarchy.
- Use **SemiBold (600)** for subheaders and navigation items.
- Maintain generous line-heights to prevent text from feeling cramped against the dark background.

## Layout & Spacing

The design system employs a **Fluid Grid** model based on an 8px rhythmic scale, with 4px increments for micro-adjustments.

- **Desktop:** 12-column grid with 24px gutters. Content is typically housed in a center-aligned container with a max-width of 1440px.
- **Tablet:** 8-column grid with 16px gutters and 24px side margins.
- **Mobile:** 4-column grid with 16px gutters and 16px side margins.

The layout philosophy emphasizes vertical rhythm and grouping. Navigation is typically housed in a fixed sidebar (approx. 280px width) to allow for quick switching between management modules.

## Elevation & Depth

In a dark-themed system, elevation is conveyed through **Tonal Layers** rather than heavy shadows. 

1. **Floor (Level 0):** The obsidian background (#121212).
2. **Surface (Level 1):** Secondary coal color (#252525) used for sidebars or card backgrounds.
3. **Overlay (Level 2):** Lighter grey-scale shades for modals and popovers, accented with a subtle **Ambient Shadow** (0px 8px 24px rgba(0,0,0,0.5)) to separate them from the interface.

**Glow Effects:** Primary elements (like active buttons or the brand icon) may utilize a soft, amber-tinted outer glow to simulate a light source in a dark room, enhancing the premium feel.

## Shapes

The shape language is **Rounded**, striking a balance between the precision of sharp edges and the modern approachability of rounder forms.

- **Standard Radius:** 0.5rem (8px) for buttons, input fields, and small cards.
- **Large Radius:** 1rem (16px) for main content containers and large modals.
- **Icon Containers:** Often use the standard radius or a circle (pill) to create distinct visual anchors.

Consistent corner radii across all components ensure the UI feels like a single, cohesive toolset.

## Components

### Buttons
- **Primary:** Solid Amber (#F2A93B) with Black text. High visibility.
- **Secondary:** Ghost style with Amber border and Amber text, or Coal background with White text.
- **Active State:** Navigation items use a Coal background with an Amber vertical accent bar on the left or a full Amber background for high-priority selection.

### Input Fields
- Dark backgrounds (#1C1C1C) with subtle Zinc borders.
- On focus, the border transitions to Amber with a very soft outer glow.

### Cards
- Use the Secondary color (#252525) to differentiate from the background.
- Keep borders minimal or non-existent, relying on the color shift for definition.

### Chips & Badges
- Used for status (e.g., "Administrador"). These should use a low-opacity Amber background with solid Amber text to remain legible without being as heavy as a primary button.

### Navigation List
- Clean, monochrome icons (Zinc) that switch to Amber when active.
- Labels use Manrope Medium/SemiBold for clarity.