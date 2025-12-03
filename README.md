# ⚔️ Transcendence Game Project ⚔️

This project is a web-based game application featuring a Pong game with single-player (AI opponent) and multiplayer modes. It incorporates user authentication, profile management, match history. The application is built using a microservices architecture orchestrated with Docker Compose, ensuring scalability and maintainability.

## 🚀 Key Features

- **🕹️ Engaging Gameplay:** Classic Pong game with responsive design and customizable settings.
- **🤖 AI Opponent:** Single-player mode with adjustable AI difficulty.
- **🔐 User Authentication:** Secure user registration, login, and two-factor authentication (2FA).
- **👤 Profile Management:** User profiles with avatars, usernames, and status updates.
- **📊 Match History:** Track your game statistics and view past matches.
- **🌐 Localization:** Support for multiple languages.
- **🐳 Dockerized Microservices:** Modular architecture for easy deployment and scaling.
- **✉️ Email Integration:** User verification and password reset functionality via email.

## 🛠️ Tech Stack

**Frontend:**

- **Vite:** Build tool and development server.
- **TypeScript:** Programming language.
- **Babylon.js:** 3D graphics engine for the game.

**Backend (Microservices):**

- **Node.js:** JavaScript runtime environment.
- **Fastify:** Web framework.
- **better-sqlite3:** SQLite database library.
- **jsonwebtoken:** JSON Web Token (JWT) library.
- **bcrypt:** Password hashing library.
- **@fastify/cors:** CORS middleware.
- **@fastify/rate-limit:** Rate limiting middleware.
- **@fastify/multipart:** Multipart form data middleware (file uploads).
- **axios:** HTTP client.

**Infrastructure:**

- **Docker:** Containerization platform.
- **Docker Compose:** Orchestration tool for multi-container Docker applications.
- **Nginx:** Reverse proxy and load balancer.

## 📦 Getting Started / Setup Instructions

### Prerequisites

- Docker: [https://www.docker.com/](https://www.docker.com/)
- Docker Compose: [https://docs.docker.com/compose/install/](https://docs.docker.com/compose/install/)
- Maileroo Accound with free API Key

### Installation

1.  Clone the repository:

    ```bash
    git clone https://github.com/MatriX1232/ft_transcendenceProject ft_transcendence
    cd ft_transcendence
    ```
2. Edit .env file:
    ```bash
    code .env
    ```
    Edit MAILEROO and MAILEROO_FROM with the values provided in the https://app.maileroo.com/domains.

    MAILEROO is an API KEY
    
    MAILEROO_FROM is the domain

3.  Build and start the application using Docker Compose:

    ```bash
    docker compose up --build
    ```

    This command will build the Docker images for all services and start them in detached mode.


### Running Locally

1.  Ensure Docker and Docker Compose are running.
2.  Access the application in your web browser at `https://localhost`. Nginx is configured to listen on port 80 and redirect HTTP requests to HTTPS.
3.  The frontend development server runs on port 5173, but Nginx proxies requests to it.
4.  The microservices are accessible through Nginx, which routes requests based on the URL.

## 📝 License

This project is licensed under the [MIT License](LICENSE).
