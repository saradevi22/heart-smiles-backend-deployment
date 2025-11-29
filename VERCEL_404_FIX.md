# Vercel 404 "Function Invocation: Not Found" Error - Fix Guide

## Problem

You're getting `404 Function Invocation: Not Found` errors in Vercel. This means Vercel cannot find or route to your serverless function.

## Root Cause

The issue was using `rewrites` in `vercel.json`, which is designed for static sites, not serverless functions. For Express apps on Vercel, you need to use `builds` configuration to tell Vercel how to build and deploy your serverless function.

## The Fix

### 1. Updated `vercel.json`

Changed from `rewrites` (for static sites) to `builds` + `routes` (for serverless functions):

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/api/index.js"
    }
  ]
}
```

### 2. Updated Export in `api/index.js`

Added both default and named export for compatibility:

```javascript
module.exports = app;
module.exports.default = app;
```

## How It Works

1. **`builds`**: Tells Vercel to build `api/index.js` as a serverless function using `@vercel/node`
2. **`routes`**: Tells Vercel to route all requests (both `/api/*` and `/*`) to the serverless function
3. **Express App**: Handles all routing internally based on the path

## Why This Works

- **`builds`** is required for serverless functions - it tells Vercel how to build your code
- **`routes`** maps incoming requests to your serverless function
- The Express app then handles the actual routing (e.g., `/api/auth`, `/api/participants`)

## About the Warning

You may see a warning: "Due to `builds` existing in your configuration file, the Build and Development Settings defined in your Project Settings will not apply."

This is **just informational** - it means:
- Your `vercel.json` configuration takes precedence
- Dashboard settings won't override your `vercel.json`
- This is actually what you want for Express apps

You can safely ignore this warning, or configure everything in `vercel.json` (which is what we're doing).

## Testing

After deploying:

1. **Check the health endpoint**: `https://your-backend.vercel.app/api/health`
   - Should return: `{ "status": "OK", "message": "HeartSmiles Backend API is running", ... }`

2. **Check an API route**: `https://your-backend.vercel.app/api/auth/login`
   - Should return a proper response (not 404)

3. **Check Vercel logs**:
   - Go to your Vercel project → Deployments → Latest deployment → Functions
   - Click on the function to see logs
   - Should see "Firebase Admin initialized successfully" (if Firebase is configured)

## Common Issues

### Issue 1: Still getting 404

**Check**:
- Is `api/index.js` in the correct location? (should be `backend/api/index.js`)
- Did you commit and push the changes?
- Did Vercel redeploy after the changes?

**Solution**: 
- Verify file structure
- Trigger a new deployment
- Check Vercel build logs for errors

### Issue 2: Routes not matching

**Check**:
- Are your Express routes set up with `/api/` prefix? (e.g., `app.use('/api/auth', ...)`)
- Is the path in the request correct?

**Solution**:
- Ensure all routes in Express use `/api/` prefix
- Check that requests are going to the correct paths

### Issue 3: Function builds but returns 404

**Check**:
- Are there any errors in the function logs?
- Is Firebase initialized correctly?
- Are environment variables set?

**Solution**:
- Check Vercel function logs
- Verify environment variables are set
- Check that Firebase credentials are correct

## File Structure

Your backend should have this structure:

```
backend/
├── api/
│   └── index.js          # Serverless function entry point
├── config/
│   └── firebase.js       # Firebase configuration
├── routes/               # Route handlers
├── controllers/          # Controllers
├── models/              # Data models
├── middleware/          # Middleware (auth, etc.)
├── server.js            # Local development server
└── vercel.json          # Vercel configuration
```

## Next Steps

1. **Commit and push** the updated `vercel.json` and `api/index.js`
2. **Wait for Vercel to redeploy** (or trigger a new deployment)
3. **Test the health endpoint** to verify it's working
4. **Check Vercel logs** if you still see issues

## Additional Notes

- The warning about `builds` is harmless - you can ignore it
- All routes should work now (both `/api/*` and root routes)
- The Express app handles all routing internally
- Local development still works with `server.js`

