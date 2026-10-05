# JEEXPERT phone installation

Deploy the production build to Vercel over HTTPS. Open its URL in Chrome on Android and choose **Install app** (or **Add to home screen**) from the browser menu. The installed app uses the existing login and backend.

The manifest supplies the name, standalone window, theme and resized original J icons. No additional PWA dependency is required.

The service worker is registered only in production. To test locally, run `npm run build` then `npm run preview`; localhost is eligible for service workers. The preview server does not provide the development API, so use the Vercel deployment to verify login and data access.

Only `/offline.html` enters Cache Storage. Navigation uses the network; failures show the public offline screen. API requests, uploaded files, cross-origin downloads and all mutations bypass the worker. No offline editing or synchronization is provided. An already-open app uses its existing error handling if connectivity drops.

New deployments load fresh application files on navigation. Worker updates activate normally after existing controlled windows close; no forced reload interrupts unsaved forms. Increment the worker cache version when changing the offline screen.

Check on the deployed site: manifest and icons return their actual files, worker registers, app installs, login works, navigation/downloads work, and a reload without connectivity shows the offline screen. Android installation must be verified on a real phone.
