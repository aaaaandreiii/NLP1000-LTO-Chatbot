# System Role & Objective:

Act as an expert Full-Stack TypeScript Developer. I need you to build a complete, separated Retrieval-Augmented Generation (RAG) web application for the Philippine Land Transportation Office (LTO). The project consists of a Vite React frontend and an Express.js backend.

### Tech Stack:

 * Frontend: Vite, React, TypeScript, Material UI (MUI), React Router. (Note: Please structure the UI to easily integrate with an existing local Material UI (theFront) folder for custom theming).
 * Backend: Node.js, Express, TypeScript, Multer (for file uploads).
 * AI & RAG Ecosystem: LangChain.js (@langchain/core, @langchain/openai, @langchain/mongodb), LlamaParse (via llamaindex), MongoDB Atlas Vector Search.

### Core Requirements:

1. Backend Architecture (Express server on port 3000):
 * Endpoint 1: /api/chat (Public)
   * Receives the user's chat query.
   * Uses LangChain's MongoDBAtlasVectorSearch to retrieve relevant document chunks from MongoDB.
   * Injects chunks into a system prompt instructing the LLM to act as a bilingual (English/Taglish) LTO assistant.
   * Forces the LLM to return strict JSON: {"status": "success" | "out_of_scope", "answer": "...", "sources": ["..."]}.
   * Returns the JSON to the frontend.
 * Endpoint 2: /api/admin/upload (Protected)
   * Accepts PDF file uploads via multer.
   * Validates a hardcoded admin password sent in the authorization headers.
   * Uses LlamaParse to extract text/markdown from the LTO PDFs (this is crucial for parsing LTO fee tables accurately).
   * Uses LangChain's RecursiveCharacterTextSplitter to chunk the parsed markdown.
   * Generates embeddings (via OpenAI) and upserts them into MongoDB Atlas Vector Search.
2. Frontend Architecture (Vite React on port 5173):
 * Route 1: / (Chat Interface)
   * A clean Material UI chat interface where users can ask questions about driver's licenses.
   * Parses the backend JSON response to display the conversational answer and a visual list of citation chips below the message.
 * Route 2: /admin (Admin Dashboard)
   * A simple login screen requiring a hardcoded password (e.g., "lto-admin-2026").
   * Once authenticated, displays a Material UI File Upload component to upload new LTO PDFs to the backend ingestion endpoint.
3. Execution Commands:
 * Provide the exact terminal commands to initialize the two folders (frontend and backend) and install the necessary npm packages.
 * Ensure the package.json scripts are set up so that npm run build && npm start functions correctly for a production-like environment.

### Step-by-Step Instructions:

 * Output the initialization and npm install commands for both directories.
 * Generate the complete Express backend code (Server setup, LangChain/MongoDB config, LlamaParse ingestion route, Chat route).
 * Generate the Vite React frontend code (Routing, Chat UI, Admin Upload UI using MUI).
 * Provide a sample .env file structure required to run the application.
