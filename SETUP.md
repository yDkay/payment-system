# Quick Setup Guide

## Prerequisites
- Node.js 18+ installed
- npm 8+ installed

## Installation (5 minutes)

1. **Extract/Clone the project**
   ```bash
   git clone <repository-url>
   cd payment-system
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Start the system**
   ```bash
   # Terminal 1 - Backend
   npm run dev:api
   
   # Terminal 2 - Frontend  
   npm run dev:web
   ```

4. **Access the application**
   - Open browser: http://localhost:3000
   - Backend API: http://localhost:3001

## Demo Flow
1. Create a payment intent with any amount
2. Click "Confirm Payment" 
3. Watch the 5 processing jobs execute in real-time
4. View the receipt and try creating a refund

## Troubleshooting
- **Port conflicts**: Kill processes using `lsof -ti:3001 | xargs kill -9`
- **Dependencies**: Run `npm run install:all` again
- **Node version**: Ensure Node.js 18+ with `node --version`

## Architecture
- **Backend**: Node.js + Express (port 3001)
- **Frontend**: React + Vite (port 3000)
