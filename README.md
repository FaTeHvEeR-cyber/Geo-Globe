# Geo-Globe

Geo-Globe is a sophisticated web application built with a modern technology stack, designed to provide advanced geospatial functionalities.

## Features

*   **Advanced Geospatial Visualization:** Leverages CesiumJS for high-performance 3D globe rendering and geospatial data visualization.
*   **Interactive Data Handling:** Integrates with `@turf/turf` for comprehensive geospatial analysis and manipulation.
*   **Modern UI Components:** Utilizes Radix UI primitives and Tailwind CSS for a clean, accessible, and responsive user interface.
*   **State Management:** Employs Zustand for efficient and scalable global state management.
*   **Data Fetching and Caching:** Implements React Query (`@tanstack/react-query`) for robust data fetching, caching, and synchronization.
*   **Form Management:** Integrates React Hook Form (`react-hook-form`) with Zod (`zod`) for powerful and type-safe form handling.
*   **Drag and Drop Functionality:** Features `@dnd-kit` for intuitive drag-and-drop interactions within the application.
*   **Rich Text Editing:** Includes `@mdxeditor/editor` for advanced rich text editing capabilities.
*   **Database Integration:** Uses Prisma ORM for seamless interaction with the database, with a sample SQLite database (`db/custom.db`) included.
*   **API Routes and Server Components:** Built on Next.js with support for both server and client components, enabling flexible application architecture.
*   **Theming and Dark Mode:** Supports dynamic theming and dark mode via `next-themes`.
*   **Real-time Communication:** Includes examples for WebSocket integration for real-time data updates.

## Installation

This project uses Bun as its package manager and runtime. Ensure you have Bun installed.

### Prerequisites

*   [Bun](https://bun.sh/) (version 1.x recommended)

### Steps

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/FaTeHvEeR-cyber/Geo-Globe.git
    cd Geo-Globe
    ```

2.  **Install dependencies:**
    ```bash
    bun install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project and populate it with your environment-specific variables. Refer to `.env.example` (if available) for a template.

    ```bash
    # Example .env file content (adjust as needed)
    DATABASE_URL="file:./db/custom.db"
    # Add any other required environment variables
    ```

4.  **Run database migrations (if applicable):**
    If Prisma is used for database management, apply migrations:
    ```bash
    bun run prisma migrate deploy
    ```

5.  **Start the development server:**
    ```bash
    bun run dev
    ```

    The application will be accessible at `http://localhost:3000` by default.

## Usage

### Development

To run the application in development mode, simply execute:

```bash
bun run dev
```

This command will start a development server with hot-reloading enabled.

### Building for Production

To create a production-ready build of the application:

```bash
bun run build
```

This command generates an optimized build in the `.next` directory.

### Starting a Production Server

After building, you can start a production server using:

```bash
bun run start
```

This command serves the application from the production build.

### Running Scripts

The project includes several utility scripts in the `.zscripts/` directory. For example:

*   **Build all mini-services:**
    ```bash
    ./.zscripts/mini-services-build.sh
    ```
*   **Start all mini-services:**
    ```bash
    ./.zscripts/mini-services-start.sh
    ```

## Configuration

### Environment Variables

The application's behavior can be configured through environment variables. Key variables include:

*   `DATABASE_URL`: The connection string for the primary database.
*   `NEXT_PUBLIC_API_URL`: The base URL for public-facing API endpoints.

Ensure these variables are set in your `.env` file or your deployment environment.

### `next.config.ts`

The `next.config.ts` file allows for advanced Next.js configuration, including:

*   Module aliases
*   Image optimization settings
*   Redirects and rewrites
*   Webpack configuration overrides

Refer to the `next.config.ts` file for specific configuration options.

### Tailwind CSS

Tailwind CSS is configured in `tailwind.config.ts` and `postcss.config.mjs`. Customizations to the design system, such as colors, fonts, and spacing, can be made here.

## Examples

### WebSocket Example

This project includes an example demonstrating WebSocket communication.

**Frontend (`examples/websocket/frontend.tsx`):**
This component establishes a WebSocket connection and sends/receives messages.

**Server (`examples/websocket/server.ts`):**
This script sets up a basic WebSocket server to handle connections and message broadcasting.

To run the WebSocket example:

1.  Ensure the main application is running.
2.  Run the WebSocket server script:
    ```bash
    bun run examples/websocket/server.ts
    ```
3.  Interact with the frontend component to test the WebSocket functionality.

## License

No license is specified for this project.

## Contributing

Contributions are welcome. Please refer to the `CONTRIBUTING.md` file (if available) for guidelines.

## Support

If you encounter any issues or have questions, please open an issue on the GitHub repository.

---

<p align="center">
  <a href="https://readmeforge.app?utm_source=badge">
    <img src="https://readmeforge.app/badge.svg" alt="Made with ReadmeForge" height="20">
  </a>
</p>
