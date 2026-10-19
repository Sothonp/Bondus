import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { dismissSplash } from './loadingScreen.js'
import 'katex/dist/katex.min.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// index.html shows a loading screen while this bundle downloads (see splashPlugin.js). Fade it out once the app has
// painted: two animation frames after render, so the first screen is already underneath when it goes.
requestAnimationFrame(() => requestAnimationFrame(() => dismissSplash()))
