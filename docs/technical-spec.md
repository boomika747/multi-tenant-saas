# Technical Specification

## Backend Structure

backend/
 ├── src/
 │   ├── controllers
 │   ├── routes
 │   ├── middleware
 │   ├── models
 │   ├── utils
 │   └── config
 ├── migrations
 └── seeds

## Frontend Structure

frontend/
 ├── src/
 │   ├── pages
 │   ├── components
 │   ├── services
 │   └── context

## Environment Variables

- DB_HOST
- DB_PORT
- DB_NAME
- JWT_SECRET
- FRONTEND_URL

## Running the Project

1. docker-compose up -d
2. Open http://localhost:3000
