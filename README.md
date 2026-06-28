# Unisphere

Unisphere is a university social platform developed as a Final Year Project. It allows students to connect, share posts, view stories, message each other, join societies, RSVP to events, explore jobs, manage profiles, and receive notifications.

## Live Website

https://unisphere-snowy.vercel.app

## Features

- Authentication with Clerk
- Feed with posts, stories, likes, comments, and delete support
- Messaging page
- Societies with join, create, and owner-only delete
- Events with RSVP, create, and owner-only delete
- Jobs with save, create, and owner-only delete
- Calendar
- Campus map
- Profile, notifications, and settings pages
- Responsive design for desktop and mobile

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Node.js
- Express.js
- PostgreSQL
- Drizzle ORM
- Clerk
- Neon
- Cloudinary
- Vercel
- GitHub
- pnpm

## Project Structure

- api/ - Vercel API entry
- artifacts/unisphere/ - Frontend application
- artifacts/api-server/ - Backend API server
- lib/db/ - Database schema
- lib/api-spec/ - OpenAPI specification
- lib/api-client-react/ - Generated API client
- scripts/ - Build scripts

## Deployment

The project is deployed on Vercel. The database is hosted on Neon, authentication is handled by Clerk, and media uploads are handled by Cloudinary.

## Environment Variables

Required environment variables include:

- DATABASE_URL
- CLERK_SECRET_KEY
- VITE_CLERK_PUBLISHABLE_KEY
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET

Real secret values must not be committed to GitHub.

## Academic Purpose

This project was developed for academic/FYP purposes as a university social networking platform prototype.
