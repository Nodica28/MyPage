# Authentication Performance Optimizations

This document explains the optimizations made to improve application startup time and reduce excessive user deserialization.

## Problem

The application was experiencing slow startup and excessive database queries due to repeating user deserialization operations. This was causing:

1. Slow initial load times
2. Excessive console logging
3. Unnecessary database queries
4. Potential performance degradation under load

## Optimizations Made

### 1. User Deserialization Caching

- Implemented effective user caching in `passport.deserializeUser`
- Added cache TTL (time-to-live) to prevent stale data
- Reduced database queries by returning cached users when available

### 2. Development Auto-Login Optimization

- Improved caching in the development auto-login middleware
- Added proper cache expiration handling
- Reduced unnecessary database queries during development

### 3. Session Configuration Improvements

- Optimized session middleware configuration
- Disabled automatic rolling session extension on every request
- Configured proper proxy settings based on environment

### 4. Verbose Logging Control

- Added a `VERBOSE_AUTH_LOGGING` environment variable flag
- Reduced excessive console output during normal operation
- Critical error logging is always preserved

## Usage

To enable verbose authentication logging (helpful for debugging but increases console output):

```
VERBOSE_AUTH_LOGGING=true npm run dev
```

For normal operation with minimal logging:

```
npm run dev
```

## Additional Notes

- The user cache has a TTL (time-to-live) of 5 minutes
- Users are automatically removed from cache after this time to prevent stale data
- The cache is in-memory, so it will be cleared on application restart

These optimizations significantly reduce database queries and improve startup time while maintaining application functionality.
