#!/bin/bash

# This script stops any previously running services and starts the development environment.

echo "Stopping existing services on ports 3001 & 5173..."
kill -9 $(lsof -t -i:3001) > /dev/null 2>&1 || true
kill -9 $(lsof -t -i:5173) > /dev/null 2>&1 || true

echo "Starting backend server in the background (logging to server.log)..."
# Start the backend server in the background
(cd server && npm start > ../server.log 2>&1 &)

# Give the backend a moment to initialize, especially for database connection
sleep 3

echo "Starting frontend server in the foreground..."
# Start the frontend server in the foreground
(cd admin && npm run dev)

echo "Development environment stopped."
