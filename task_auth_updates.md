# Task: Authentication Flow & Navigation Updates

- [x] **Post-Login Redirect**
    - [x] Redirect user to Home (`/`) instead of `/client` after login in `app/(auth)/login/page.tsx`.

- [x] **Login/Signup Page Navigation**
    - [x] Create `app/(auth)/layout.tsx` to wrap auth pages with the `Navbar`.
    - [x] Update `login/page.tsx` and `signup/page.tsx` styles to play nicely with the new layout (`flex-1` instead of `min-h-screen`).
    - [x] Ensure Home and Contact links are visible (handled by Navbar inclusion).

- [x] **"Mi Cuenta" Toggle Menu**
    - [x] Install `shadcn/dropdown-menu`.
    - [x] Update `components/marketing/Navbar.tsx` to replace the simple button with a Dropdown Menu.
    - [x] Add menu options:
        - "Entrenamientos" -> `/client`
        - "Mi Perfil" -> `/client/profile`
        - "Cerrar Sesión" -> Logout logic
    - [x] Create placeholder `app/(dashboard)/client/profile/page.tsx` to prevent 404s.

- [x] **Navigation Bar Persistence**
    - [x] Navbar is now present on Auth pages via the new layout.
