# Bank Assignment System

A React application for managing bank information updates. The system allows users to:

1. Enter their name (stored in local storage)
2. Get assigned to an unassigned bank record
3. Update bank information including:
   - Phone number
   - Address changes
   - Name changes
   - Remarks

## Features

- User authentication via name storage
- Automatic assignment of unassigned bank records
- Form validation using Zod
- Modern UI with shadcn/ui components
- Real-time updates to Google Sheets via Sheety API

## Technologies Used

- React
- TypeScript
- Vite
- shadcn/ui
- Tailwind CSS
- React Hook Form
- Zod
- Axios

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## API Integration

The application uses the Sheety API to interact with a Google Sheet. The API endpoint is:
```
https://api.sheety.co/632604ca09353483222880568eb0ebe2/bankAddressForCalling/banks
```

## Workflow

1. User enters their name
2. System finds an unassigned bank record
3. User is presented with the bank's details
4. User can:
   - Enter phone number
   - Select type of change needed
   - Update address and/or bank name
   - Add remarks
5. On submission, the Google Sheet is updated
6. User can cancel assignment and move to another record
