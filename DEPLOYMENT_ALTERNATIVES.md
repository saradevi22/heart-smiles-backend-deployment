# Backend Deployment Alternatives to Vercel

Since Vercel is causing routing issues with Express, here are better alternatives for deploying your Node.js/Express backend.

## Option 1: Railway (Recommended - Easiest)

### Steps:
1. **Sign up**: Go to [railway.app](https://railway.app) and sign up with GitHub
2. **Create New Project**: Click "New Project" → "Deploy from GitHub repo"
3. **Select Repository**: Choose your `heart-smiles-backend` repository
4. **Configure**:
   - Railway will auto-detect it's a Node.js project
   - Root Directory: Leave as root (or set to `backend/` if deploying from monorepo)
   - Build Command: `npm install` (auto-detected)
   - Start Command: `npm start` (uses `node server.js` from package.json)
5. **Set Environment Variables**: 
   - Go to Variables tab
   - Add all your `.env` variables:
     - `JWT_SECRET`
     - `FIREBASE_PROJECT_ID`
     - `FIREBASE_PRIVATE_KEY`
     - `FIREBASE_CLIENT_EMAIL`
     - `CLOUDINARY_CLOUD_NAME`
     - `CLOUDINARY_API_KEY`
     - `CLOUDINARY_API_SECRET`
     - `OPENAI_API_KEY`
     - `FRONTEND_URL` (your Vercel frontend URL)
6. **Deploy**: Railway will automatically deploy
7. **Get URL**: Railway provides a URL like `https://your-app-name.up.railway.app`

### Update Frontend:
Update `src/services/api.js`:
```javascript
const PRODUCTION_API_URL = 'https://your-app-name.up.railway.app/api';
```

---

## Option 2: Render (Free Tier Available)

### Steps:
1. **Sign up**: Go to [render.com](https://render.com) and sign up
2. **New Web Service**: Click "New" → "Web Service"
3. **Connect Repository**: Connect your GitHub `heart-smiles-backend` repo
4. **Configure**:
   - **Name**: `heart-smiles-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid for better performance)
5. **Set Environment Variables**: Add all your `.env` variables in the Environment tab
6. **Deploy**: Click "Create Web Service"
7. **Get URL**: Render provides a URL like `https://heart-smiles-backend.onrender.com`

### Update Frontend:
Update `src/services/api.js`:
```javascript
const PRODUCTION_API_URL = 'https://heart-smiles-backend.onrender.com/api';
```

**Note**: Free tier on Render spins down after 15 minutes of inactivity, so first request may be slow.

---

## Option 3: Fly.io

### Steps:
1. **Install Fly CLI**: `curl -L https://fly.io/install.sh | sh`
2. **Sign up**: `fly auth signup`
3. **In backend directory**: `fly launch`
4. **Follow prompts**: Fly will create a `fly.toml` config
5. **Set secrets**: `fly secrets set JWT_SECRET=your-secret ...` (for all env vars)
6. **Deploy**: `fly deploy`
7. **Get URL**: `https://your-app-name.fly.dev`

---

## Option 4: DigitalOcean App Platform

### Steps:
1. **Sign up**: Go to [digitalocean.com](https://digitalocean.com)
2. **Create App**: Click "Create" → "App"
3. **Connect GitHub**: Select your backend repository
4. **Configure**:
   - Type: Web Service
   - Build Command: `npm install`
   - Run Command: `npm start`
   - HTTP Port: `5000` (or whatever PORT you use)
5. **Environment Variables**: Add all your `.env` variables
6. **Deploy**: Click "Create Resources"
7. **Get URL**: DigitalOcean provides a URL

---

## After Deployment - Update Frontend

Once you have your backend URL, update the frontend:

1. **Update `src/services/api.js`**:
   ```javascript
   const PRODUCTION_API_URL = 'https://your-backend-url.com/api';
   ```

2. **Update Backend CORS** (if needed):
   In your backend `server.js` or `api/index.js`, make sure CORS allows your frontend:
   ```javascript
   const allowedOrigins = [
     'https://heart-smiles-frontend-ri7gn79hh-sara-devis-projects.vercel.app',
     // Add your actual frontend URL
   ];
   ```

3. **Commit and push frontend changes**:
   ```bash
   git add src/services/api.js
   git commit -m "Update backend URL to new deployment"
   git push frontend main
   ```

4. **Redeploy frontend on Vercel** (should auto-deploy from GitHub push)

---

## Recommended: Railway

**Why Railway?**
- ✅ Easiest setup (just connect GitHub repo)
- ✅ Automatic deployments on git push
- ✅ Free tier with $5 credit monthly
- ✅ No cold starts (always running)
- ✅ Simple environment variable management
- ✅ Great for Express/Node.js apps

**Cost**: Free tier gives $5/month credit, which is usually enough for small apps.

---

## Environment Variables Checklist

Make sure to set these in your deployment platform:

- `JWT_SECRET` - Required
- `FIREBASE_PROJECT_ID` - Required
- `FIREBASE_PRIVATE_KEY` - Required (with `\n` as actual newlines)
- `FIREBASE_CLIENT_EMAIL` - Required
- `CLOUDINARY_CLOUD_NAME` - Required
- `CLOUDINARY_API_KEY` - Required
- `CLOUDINARY_API_SECRET` - Required
- `OPENAI_API_KEY` - Required
- `FRONTEND_URL` - Your Vercel frontend URL (for CORS)
- `PORT` - Usually auto-set by platform, but can specify
- `NODE_ENV` - Set to `production`

---

## Testing After Deployment

1. Test health endpoint: `https://your-backend-url.com/api/health`
2. Test login: `https://your-backend-url.com/api/auth/login` (POST)
3. Check CORS: Make sure frontend can make requests
4. Check logs: Monitor deployment platform logs for errors

