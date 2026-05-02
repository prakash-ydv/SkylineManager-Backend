# Skyline Manager API Documentation

This document outlines the authentication and authorization endpoints for the Skyline Manager Backend.

## Base URL
`http://localhost:5000/api/auth`

## Authentication Method
The system uses **JWT (JSON Web Tokens)** stored in an `httpOnly` cookie named `jwt`. This cookie is automatically handled by the browser for subsequent requests after a successful login.

---

## Endpoints

### 1. Register User
- **URL:** `/api/auth/register`
- **Method:** `POST`
- **Access:** Admin Only
- **Description:** Creates a new user in the system.
- **Request Body:**
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "employee" // Options: 'admin', 'employee', 'marketing'
  }
  ```
- **Success Response:** `201 Created`

### 2. Login User
- **URL:** `/api/auth/login`
- **Method:** `POST`
- **Access:** Public
- **Description:** Authenticates user and sets the `jwt` cookie.
- **Request Body:**
  ```json
  {
    "email": "admin@skyline.com",
    "password": "password123"
  }
  ```
- **Success Response:** `200 OK` (Returns user details and sets cookie)

### 3. Logout User
- **URL:** `/api/auth/logout`
- **Method:** `POST`
- **Access:** Public
- **Description:** Clears the `jwt` cookie.
- **Success Response:** `200 OK`

### 4. Get Current User (Me)
- **URL:** `/api/auth/me`
- **Method:** `GET`
- **Access:** Private (Requires valid `jwt` cookie)
- **Description:** Returns the profile of the currently logged-in user.
- **Success Response:** `200 OK`

---

## Role-Based Access Control (RBAC)
| Endpoint | Public | Employee | Marketing | Admin |
| :--- | :---: | :---: | :---: | :---: |
| `/login` | ✅ | ✅ | ✅ | ✅ |
| `/logout` | ✅ | ✅ | ✅ | ✅ |
| `/me` | ❌ | ✅ | ✅ | ✅ |
| `/register` | ❌ | ❌ | ❌ | ✅ |

---

## Error Handling
The API returns standard HTTP status codes:
- `400 Bad Request`: Validation errors or user already exists.
- `401 Unauthorized`: No token or invalid token.
- `403 Forbidden`: User does not have the required role.
- `404 Not Found`: Resource not found.
- `500 Server Error`: Internal server issues.
