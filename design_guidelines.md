# Legal Tech Case Management System - Design Guidelines

## Design Approach: Modern Productivity System
**Selected Framework:** Hybrid approach inspired by Linear (interface clarity) + Notion (information hierarchy) + Stripe Dashboard (professional data presentation)

**Justification:** Legal professionals require reliable, efficient interfaces where information hierarchy and usability trump visual flair. The design emphasizes clarity, professionalism, and productivity.

## Core Design Elements

### A. Color Palette

**Light Mode:**
- Primary: 222 47% 11% (Deep charcoal - professional authority)
- Primary Hover: 222 47% 18%
- Background: 0 0% 100% (Pure white)
- Surface: 220 13% 97% (Subtle off-white for cards)
- Border: 220 13% 91%
- Text Primary: 222 47% 11%
- Text Secondary: 220 9% 46%
- Text Tertiary: 220 9% 64%
- Success: 142 71% 45%
- Warning: 38 92% 50%
- Error: 0 72% 51%
- Info: 217 91% 60%

**Dark Mode:**
- Primary: 217 91% 60% (Professional blue)
- Primary Hover: 217 91% 70%
- Background: 222 47% 11%
- Surface: 217 33% 17%
- Border: 217 33% 24%
- Text Primary: 0 0% 98%
- Text Secondary: 217 20% 70%
- Text Tertiary: 217 20% 55%

### B. Typography
- **Primary Font:** Inter (Google Fonts) - exceptional readability for dense information
- **Monospace:** JetBrains Mono - for email templates, code snippets
- **Scale:**
  - Headings: text-3xl (30px) font-semibold for page titles, text-xl (20px) font-semibold for section headers
  - Body: text-base (16px) for primary content, text-sm (14px) for secondary info
  - Labels: text-sm (14px) font-medium uppercase tracking-wide
  - Code/Templates: text-sm (14px) font-mono

### C. Layout System
**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16 for consistent rhythm
- Component padding: p-6 for cards, p-4 for compact elements
- Section spacing: space-y-6 for related content, space-y-12 for distinct sections
- Container: max-w-7xl mx-auto px-6

### D. Component Library

**Navigation:**
- Top bar: Fixed header with logo, breadcrumbs, search, profile (h-16, border-b)
- Sidebar: Collapsible left navigation (w-64 expanded, w-16 collapsed) with icon + label pattern

**Settings Page Structure:**
- Page header with title and description (pb-6 border-b)
- Horizontal tab navigation (bg-surface rounded-lg p-1 inline-flex gap-1)
- Tab panels with consistent padding (pt-8)

**SMTP Configuration Tab:**
- Two-column form layout (grid-cols-1 lg:grid-cols-2 gap-6)
- Input groups: Label above input, helper text below, error states with border-error
- Server settings section, authentication section, test email section
- "Test Connection" button with loading state indicator
- Success/error toast notifications

**Email Templates Tab:**
- Split layout: Template list (w-80 border-r) + Template editor (flex-1)
- Template list: Searchable, categorized by type (Case Updates, Notifications, Reports)
- Template editor: Template name field, subject line, rich text editor area with variable insertion dropdown
- Preview panel toggle: Side-by-side or fullscreen preview
- Variables panel: Collapsible sidebar showing available merge tags with copy functionality

**Form Elements:**
- Inputs: h-10 rounded-md border bg-background px-3 with focus:ring-2 focus:ring-primary
- Select dropdowns: Custom styled with chevron icon
- Textareas: min-h-32 for template content
- Checkboxes/Toggles: Accessible switches for boolean settings
- Action buttons: Primary (bg-primary text-white), Secondary (border-2 border-primary text-primary), Tertiary (text-primary hover:bg-surface)

**Data Display:**
- Tables: Striped rows (even:bg-surface), sticky headers, sortable columns with arrow indicators
- Cards: bg-surface rounded-lg border p-6 shadow-sm
- Status badges: Rounded-full px-3 py-1 text-xs font-medium (success/warning/error colors)
- Empty states: Centered with icon, title, description, and action button

**Overlays:**
- Modal dialogs: max-w-2xl centered, backdrop-blur-sm bg-black/50
- Confirmation dialogs: Compact (max-w-md) with clear destructive action indication
- Toast notifications: Fixed bottom-right, slide-in animation, auto-dismiss after 5s

### E. Animations
**Sparingly Used, Purposeful Only:**
- Tab transitions: Duration-200 ease-in-out
- Form feedback: Shake animation on error (duration-300)
- Loading states: Subtle pulse on skeleton screens
- NO decorative animations, NO scroll-triggered effects

## Images

**Settings Page:** No hero image required - this is a utility page focused on configuration

**Dashboard/Marketing Pages (if created):**
- Hero: Professional courtroom/mediation setting with subtle overlay (1920x800px minimum)
- Feature sections: Abstract legal/justice imagery (scales, gavels) rendered minimally with duotone treatment
- Testimonial sections: Professional headshots in circular frames (200x200px)

## Page-Specific Implementation

**Settings Page Layout:**
1. Page header: "Settings" title (text-3xl font-semibold) + breadcrumb
2. Tab navigation container (bg-surface rounded-lg p-1 mb-8)
3. Tab content area with consistent top padding
4. Sticky action bar at bottom for save/cancel buttons (when changes detected)

**SMTP Configuration Content:**
- Server Configuration card, Authentication card, Advanced Settings card (vertically stacked)
- Each card has clear section header with icon
- Form fields with inline validation
- Test connection panel as separate card with results display area

**Email Templates Content:**
- Fixed left sidebar with template categories (Accordion-style with expand/collapse)
- Main editor with toolbar: Bold, Italic, Link, Variable insertion
- Live preview toggle button in top-right of editor
- Save template button always visible (sticky)

**Professional Polish:**
- All inputs have consistent height (h-10 or h-12)
- Error states are immediately visible with red border + error icon + error message
- Success states use green checkmark icon with confirmation message
- Loading states use skeleton screens, not spinners
- Keyboard navigation fully supported (focus rings visible)