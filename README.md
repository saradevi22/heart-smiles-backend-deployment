# HeartSmiles Backend API

This is the backend API for the HeartSmiles Youth Success App, built with Node.js, Express, and Firebase Firestore.

## Features

- **Authentication System**: JWT-based authentication for HeartSmiles and UMD staff
- **Data Models**: Participants, Programs, and Staff management
- **File Upload**: Cloudinary integration for image uploads
- **Data Export**: CSV export functionality for Qualtrics integration
- **Data Import**: Excel/CSV import with OpenAI-powered data processing
- **Role-based Access**: Different permissions for HeartSmiles vs UMD staff

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Configuration

Copy the `.env.example` file to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:

#### Server Configuration
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (development/production)
- `FRONTEND_URL`: Frontend URL for CORS

#### Firebase Configuration
- `FIREBASE_PROJECT_ID`: Your Firebase project ID
- `FIREBASE_PRIVATE_KEY`: Firebase service account private key
- `FIREBASE_CLIENT_EMAIL`: Firebase service account email

#### JWT Configuration
- `JWT_SECRET`: Secret key for JWT tokens
- `JWT_EXPIRES_IN`: Token expiration time (default: 24h)

#### Cloudinary Configuration
- `CLOUDINARY_CLOUD_NAME`: Your Cloudinary cloud name
- `CLOUDINARY_API_KEY`: Cloudinary API key
- `CLOUDINARY_API_SECRET`: Cloudinary API secret

#### OpenAI Configuration
- `OPENAI_API_KEY`: OpenAI API key for data processing

### 3. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Go to Project Settings > Service Accounts
4. Generate a new private key
5. Download the JSON file and extract the values for your `.env` file

### 4. Cloudinary Setup

1. Sign up at [Cloudinary](https://cloudinary.com/)
2. Get your cloud name, API key, and API secret from the dashboard
3. Add these to your `.env` file

### 5. OpenAI Setup

1. Sign up at [OpenAI](https://openai.com/)
2. Generate an API key
3. Add it to your `.env` file

## Running the Server

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

The server will start on the port specified in your `.env` file (default: 5000).

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new staff member
- `POST /api/auth/login` - Login staff member
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password

### Participants
- `GET /api/participants` - Get all participants (with filters)
- `GET /api/participants/:id` - Get participant by ID
- `POST /api/participants` - Create participant (HeartSmiles only)
- `PUT /api/participants/:id` - Update participant (HeartSmiles only)
- `DELETE /api/participants/:id` - Delete participant (HeartSmiles only)
- `POST /api/participants/:id/programs/:programId` - Add to program
- `DELETE /api/participants/:id/programs/:programId` - Remove from program
- `POST /api/participants/:id/notes` - Add note to participant

### Programs
- `GET /api/programs` - Get all programs
- `GET /api/programs/:id` - Get program by ID
- `POST /api/programs` - Create program (HeartSmiles only)
- `PUT /api/programs/:id` - Update program (HeartSmiles only)
- `DELETE /api/programs/:id` - Delete program (HeartSmiles only)

### File Upload
- `POST /api/upload/single` - Upload single image
- `POST /api/upload/multiple` - Upload multiple images
- `DELETE /api/upload/:publicId` - Delete image

### Data Export
- `GET /api/export/participants` - Export participants to CSV
- `GET /api/export/programs` - Export programs to CSV
- `GET /api/export/combined` - Export combined data to CSV

### Data Import
- `POST /api/import/participants` - Import participants from Excel/CSV
- `POST /api/import/programs` - Import programs from Excel/CSV

## User Roles

### HeartSmiles Staff
- Full CRUD access to all data
- Can create, update, delete participants and programs
- Can upload images and import/export data
- Can manage other staff accounts

### UMD Staff
- Read-only access to participants and programs
- Can export data for reporting
- Cannot modify any data

## Data Models

### Participant
- `name`: String (required)
- `dateOfBirth`: String (YYYY-MM-DD format)
- `address`: String
- `referralDate`: String (YYYY-MM-DD format)
- `programs`: Array of program IDs
- `school`: String
- `identificationNumber`: String (required, unique)
- `headshotPictureUrl`: String (Cloudinary URL)
- `uploadedPhotos`: Array of Cloudinary URLs
- `notes`: Array of note objects

### Program
- `name`: String (required)
- `description`: String (required)
- `participants`: Array of participant IDs

### Staff
- `username`: String (required, unique)
- `name`: String (required)
- `email`: String (required, unique)
- `phoneNumber`: String
- `profilePictureUrl`: String (Cloudinary URL)
- `role`: String ('heartSmiles' or 'umd')
- `isActive`: Boolean

## Deployment

### Vercel Deployment

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Set environment variables in Vercel dashboard

### Environment Variables for Production

Make sure to set all required environment variables in your production environment.

## Security Features

- JWT-based authentication
- Role-based access control
- Rate limiting (100 requests per 15 minutes)
- Helmet.js for security headers
- Input validation with express-validator
- File upload restrictions and validation
- CORS configuration

## Error Handling

The API includes comprehensive error handling with appropriate HTTP status codes and error messages.

## Health Check

- `GET /api/health` - Returns server status and timestamp

## Support

For questions or issues, please contact the development team.
# heart-smiles-backend-deployment
