# ClearTab

ClearTab is a simple group expense sharing web application built with Express, EJS, MongoDB, and Redis. It supports passwordless email login via OTP, group creation, expense splitting, settlement tracking, and basic user settings.

## Features

- Passwordless authentication using email OTP
- User registration and login via secure JWT cookies
- Dashboard showing groups, balances, and minimized transactions
- Create and invite users to expense groups
- Add expenses with custom split logic
- Track activity history for group expenses and settlements
- Change username and delete account through settings
- 404 page for unknown routes, with redirect hints if logged in

## Tech Stack

- Node.js + Express
- EJS templating engine
- MongoDB (Mongoose)
- Redis (OTP storage and expiry)
- JSON Web Token (`jsonwebtoken`)
- Nodemailer for OTP and welcome emails
- `cookie-parser` for auth cookie handling
- `dotenv` for environment variables

## Installation

1. Clone the repository

    ```bash
    git clone <repo-url>
    cd ClearTab
    ```

2. Install dependencies

    ```bash
    npm install
    ```

3. Create a `.env` file in the project root with the required values

    ```env
    PORT=6767
    MONGODB_URI=<your-mongodb-uri>
    JWT_SECRET=<your-jwt-secret>
    EMAIL_HOST=<smtp-host>
    EMAIL_PORT=<smtp-port>
    EMAIL_USER=<smtp-user>
    EMAIL_PASS=<smtp-password>
    EMAIL_FROM=<from-address>
    REDIS_HOST=<redis-host>
    REDIS_PORT=<redis-port>
    REDIS_PASSWORD=<redis-password>
    ```

4. Start the app in development mode

    ```bash
    npm run dev
    ```

5. Open `http://localhost:6767`

## Environment Variables

- `PORT` - Server port (default is `6767`)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key used to sign JWT tokens
- `EMAIL_HOST` - SMTP host for sending OTP and welcome emails
- `EMAIL_PORT` - SMTP port
- `EMAIL_USER` - SMTP username
- `EMAIL_PASS` - SMTP password
- `EMAIL_FROM` - From address used for email sending
- `REDIS_HOST` - Redis host address
- `REDIS_PORT` - Redis port
- `REDIS_PASSWORD` - Redis password (if required)

## Project Structure

- `index.js` - App entry point
- `routes/` - Express routers for auth, groups, activity, and settings
- `functions/` - Shared helper modules: JWT, mailing, balance calculations, transaction minimization
- `middleware/` - Route middleware such as cookie auth checks
- `schema/` - Mongoose models for `User`, `Group`, `Expense`, and `Statement`
- `views/` - EJS templates for pages and UI
- `public/` - Static assets

## Main Routes

- `GET /` - Home page and OTP request form
- `POST /auth/send-otp` - Send OTP to email
- `POST /auth/verify-otp` - Verify OTP and sign in
- `GET /auth/logout` - Clear auth cookie and log out
- `GET /dashboard` - User dashboard with balances and minimized settlements
- `GET /groups` - List groups
- `GET /groups/new` - New group form
- `POST /groups/new` - Create a new group
- `GET /groups/:id` - Group details
- `GET /groups/:id/invite` - Join group via invite link
- `POST /groups/:id/invite` - Accept group invite
- `GET /groups/:id/expenses/new` - Add new expense form
- `POST /groups/:id/expenses/new` - Create new expense
- `POST /groups/:id/settle` - Record settlement payment
- `POST /groups/:id/delete` - Delete a group (owner only)
- `GET /activity` - Activity feed for group expenses and settlements
- `GET /settings` - Account settings
- `POST /settings/username` - Update username
- `POST /settings/delete-account` - Delete user account

## Notes

- The app requires MongoDB and Redis to be running and properly configured.
- OTP codes are stored temporarily in Redis and expire after 10 minutes.
- Authentication state is stored in a secure cookie named `authToken`.
- Group deletion removes associated expenses and settlements.

## Development

- Uses `nodemon` for hot reload in development
- Add or tweak EJS views in `views/`
- Add routes under `routes/` and helpers under `functions/`

## License

This project uses the ISC license.
