'use client'

// This page is fully client-side rendered.
// Reason: SQLite database is only available at runtime, not during build.
// The CatalogClient component fetches data via API routes after hydration.

export { CatalogPageWrapper as default } from './CatalogPageWrapper'
