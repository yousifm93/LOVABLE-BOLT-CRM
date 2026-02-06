

# Fix CRM App Stuck in Loading State

## Problem
The app is stuck showing "Loading..." indefinitely. The console logs show `AuthRetryableFetchError: Failed to fetch` when trying to refresh the auth token. When the Supabase `getSession()` call hangs due to a failed token refresh, the `loading` state in `useAuth` never transitions to `false`, leaving the app frozen.

## Root Cause
In `src/hooks/useAuth.tsx`, the `supabase.auth.getSession()` call can hang indefinitely if the underlying token refresh fails. There is no timeout or error handling to guarantee `setLoading(false)` is called.

## Changes

### File: `src/hooks/useAuth.tsx`

**1. Add a safety timeout for the loading state**

Add a `setTimeout` that forces `setLoading(false)` after 5 seconds, preventing infinite loading if auth initialization hangs.

**2. Add error handling for `getSession()`**

Wrap the `getSession()` call with `.catch()` to ensure loading is set to false even on network failures.

**3. Add global unhandled rejection handler in `src/App.tsx`**

Add a `useEffect` in the `App` component that listens for `unhandledrejection` events and logs them, preventing silent crashes.

### Technical Details

```tsx
// useAuth.tsx - Add safety timeout inside the useEffect
const safetyTimeout = setTimeout(() => {
  if (mounted) {
    console.warn('Auth loading safety timeout reached');
    setLoading(false);
  }
}, 5000);

// Add .catch to getSession
supabase.auth.getSession()
  .then(({ data: { session } }) => {
    if (!mounted) return;
    setSession(session);
    setUser(session?.user ?? null);
    setLoading(false);
  })
  .catch((err) => {
    console.error('getSession failed:', err);
    if (!mounted) return;
    setLoading(false);
  });

// Clear timeout in cleanup
return () => {
  mounted = false;
  clearTimeout(safetyTimeout);
  subscription.unsubscribe();
  window.removeEventListener('storage', handleStorageChange);
};
```

```tsx
// App.tsx - Add unhandled rejection handler
function App() {
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled rejection:", event.reason);
      event.preventDefault();
    };
    window.addEventListener("unhandledrejection", handleRejection);
    return () => window.removeEventListener("unhandledrejection", handleRejection);
  }, []);

  return ( ... );
}
```

## Result
- If auth initialization fails or hangs, the app will stop loading after 5 seconds and redirect to the login page instead of showing "Loading..." forever.
- Network errors during session refresh are caught gracefully.
- Unhandled promise rejections no longer crash the app silently.

