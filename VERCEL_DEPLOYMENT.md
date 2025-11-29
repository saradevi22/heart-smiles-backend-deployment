# Vercel Deployment Guide for Backend

## Prerequisites
1. Install Vercel CLI: `npm i -g vercel`
2. Have a Vercel account (sign up at https://vercel.com)

## Deployment Steps

### 1. Configure Environment Variables
Before deploying, you need to set up environment variables in Vercel:

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add all the variables from `backend/.env.example`:
   - `PORT` (optional, Vercel sets this automatically)
   - `NODE_ENV=production`
   - `FRONTEND_URL` (your Vercel frontend URL, e.g., `https://your-app.vercel.app`)
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_PRIVATE_KEY` (with proper newline escaping)
   - `FIREBASE_CLIENT_EMAIL`
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN=24h`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `OPENAI_API_KEY`

### 2. Deploy from Backend Directory

```bash
cd backend
vercel
```

Follow the prompts:
- Set up and deploy? **Yes**
- Which scope? (select your account)
- Link to existing project? **No** (for first deployment)
- Project name: `heart-smiles-backend` (or your preferred name)
- Directory: `./` (current directory)
- Override settings? **No**

### 3. Update Frontend API URL

After deployment, Vercel will provide you with a URL like:
`https://heart-smiles-backend.vercel.app`

Update your frontend `.env` file:
```
REACT_APP_API_BASE_URL=https://heart-smiles-backend.vercel.app/api
```

### 4. Update CORS in Vercel

Make sure your `FRONTEND_URL` environment variable in Vercel matches your frontend deployment URL.

### 5. Test the Deployment

Visit: `https://your-backend-url.vercel.app/api/health`

You should see:
```json
{
  "status": "OK",
  "message": "HeartSmiles Backend API is running",
  "timestamp": "..."
}
```

## Important Notes

- **Firebase Private Key**: When adding `FIREBASE_PRIVATE_KEY` in Vercel, make sure to include the newlines. The format should be:
  ```
  -----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n
  ```

- **File Uploads**: Vercel has a 4.5MB limit for serverless functions. For larger uploads, consider using Vercel's Blob storage or keeping Cloudinary.

- **Rate Limiting**: The current rate limiting may need adjustment for production. Consider using Vercel's built-in rate limiting or adjusting the limits.

- **Environment Variables**: All sensitive keys should be added in Vercel dashboard, not committed to git.

## Troubleshooting

### CORS Errors
- Verify `FRONTEND_URL` is set correctly in Vercel
- Check that your frontend is making requests to the correct backend URL
- Ensure credentials are being sent if using cookies

### Function Timeout
- **Hobby Plan**: 10-second timeout (default)
- **Pro Plan**: Up to 60 seconds
- To configure timeout, go to Vercel Dashboard → Your Project → Settings → Functions → Max Duration
- For longer operations (like AI processing), consider using background jobs or upgrading to Pro plan
- Note: The `functions` property cannot be used with `builds` in `vercel.json`, so timeout must be configured in the dashboard

### Cold Starts
- First request after inactivity may be slower (cold start)
- This is normal for serverless functions

