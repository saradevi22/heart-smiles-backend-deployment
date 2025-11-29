# Vercel 401 Unauthorized Error - Fix Guide

## Problem

You're getting `401 Unauthorized` errors in Vercel deployment logs. This is typically caused by:

1. **Missing `JWT_SECRET` environment variable** - Most common cause
2. **Different `JWT_SECRET` between local and Vercel** - Tokens generated locally won't work in Vercel
3. **Authorization header not being passed correctly** - CORS or header configuration issues

## The Fix

### 1. Enhanced Error Logging

Added comprehensive logging to the authentication middleware to help identify the exact cause:
- Logs when `JWT_SECRET` is missing
- Logs JWT verification errors with details
- Logs authentication failures with context

### 2. Environment Variable Validation

Added startup validation that checks for required environment variables:
- Checks for `JWT_SECRET` at module load time
- Logs clear error messages if missing
- Prevents silent failures

### 3. Better Error Messages

Authentication errors now provide more context:
- Clear error when `JWT_SECRET` is missing
- Detailed JWT verification errors
- Better debugging information in logs

## How to Fix in Vercel

### Step 1: Check Your Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Verify that `JWT_SECRET` is set

### Step 2: Set JWT_SECRET (if missing)

1. In Vercel dashboard, go to **Settings** → **Environment Variables**
2. Click **Add New**
3. Add:
   - **Key**: `JWT_SECRET`
   - **Value**: Your JWT secret (should be a long, random string)
   - **Environment**: Select all environments (Production, Preview, Development)
4. Click **Save**

### Step 3: Ensure JWT_SECRET Matches

**Important**: The `JWT_SECRET` in Vercel must match the one used locally, OR you need to:
- Log in again after deploying (tokens are environment-specific)
- Use the same `JWT_SECRET` in both local `.env` and Vercel

### Step 4: Check Vercel Logs

After deploying, check the Vercel function logs:
1. Go to your Vercel project dashboard
2. Click on **Deployments**
3. Click on the latest deployment
4. Click on **Functions** tab
5. Click on a function to see logs

Look for:
- `ERROR: Missing required environment variables: ['JWT_SECRET']` - Means you need to set it
- `JWT verification error:` - Means token is invalid (likely different secret)
- `Authentication failed: No token provided` - Means Authorization header is missing

## Common Issues and Solutions

### Issue 1: "JWT_SECRET is not configured"

**Solution**: Set `JWT_SECRET` in Vercel environment variables (see Step 2 above)

### Issue 2: "Invalid token" errors

**Possible causes**:
- `JWT_SECRET` in Vercel is different from local
- Token was generated with a different secret
- Token format is incorrect

**Solution**:
1. Ensure `JWT_SECRET` matches between local and Vercel
2. Log in again after deployment (generates new token with correct secret)
3. Check that Authorization header is being sent: `Authorization: Bearer <token>`

### Issue 3: "Token expired"

**Solution**: This is normal - tokens expire after 24 hours (or whatever `JWT_EXPIRES_IN` is set to). User needs to log in again.

### Issue 4: CORS issues preventing Authorization header

**Solution**: Check that:
1. CORS is configured correctly in `api/index.js`
2. Frontend is sending `Authorization` header
3. `credentials: true` is set in CORS config (already done)

## Testing

After setting `JWT_SECRET` in Vercel:

1. **Redeploy** your backend
2. **Check logs** for the validation message (should not see "Missing required environment variables")
3. **Try logging in** from your frontend
4. **Check Vercel logs** for any authentication errors

## Verification

To verify `JWT_SECRET` is set correctly:

1. Check Vercel logs - you should NOT see:
   ```
   ERROR: Missing required environment variables: ['JWT_SECRET']
   WARNING: JWT_SECRET environment variable is not set!
   ```

2. Try making an authenticated request - should work without 401 errors

3. Check logs for successful authentication (no error messages)

## Additional Notes

- **Security**: Never commit `JWT_SECRET` to git. Always use environment variables.
- **Different Environments**: You can use different `JWT_SECRET` values for different environments, but users will need to log in again when switching environments.
- **Token Expiration**: Tokens expire after the time specified in `JWT_EXPIRES_IN` (default: 24 hours). Users need to log in again after expiration.

