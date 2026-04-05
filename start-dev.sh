#!/bin/bash

# This script stops any previously running services and starts the development environment.

echo "Stopping existing services on ports 3002, 5174, 3000..."
kill -9 $(lsof -t -i:3002) > /dev/null 2>&1 || true
kill -9 $(lsof -t -i:5173) > /dev/null 2>&1 || true
kill -9 $(lsof -t -i:5174) > /dev/null 2>&1 || true
kill -9 $(lsof -t -i:3000) > /dev/null 2>&1 || true

echo "Starting backend server (Port 3002)..."
(cd server && npm start > ../server.log 2>&1 &)

echo "Starting user frontend (Port 3000)..."
(cd user && npm run dev > ../user.log 2>&1 &)

# Give a moment to initialize
sleep 3

echo "Starting admin dashboard (Port 5174)..."
(cd admin && npm run dev -- --port 5174 > ../admin.log 2>&1 &)

echo "Development environment stopped."
