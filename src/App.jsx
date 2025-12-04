import React, { useState, useEffect } from 'react';
import ImageConverter from './components/ImageConverter';

function App() {
  const [theme, setTheme] = useState('midnight');

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div className="container">
      {/* Animated Background Orbs */}
      <div className="bg-orb bg-orb-1"></div>
      <div className="bg-orb bg-orb-2"></div>

      <div className="header-wrapper">
        <header className="header">
          <h1>Image Magic Studio</h1>
          <p>Transform, Edit, and Create with Joy ✨</p>
        </header>

        <div className="theme-switcher">
          <button
            className={`theme-btn ${theme === 'midnight' ? 'active' : ''}`}
            onClick={() => setTheme('midnight')}
            style={{ background: '#0f172a' }}
            title="Midnight"
          />
          <button
            className={`theme-btn ${theme === 'cyberpunk' ? 'active' : ''}`}
            onClick={() => setTheme('cyberpunk')}
            style={{ background: '#000' }}
            title="Cyberpunk"
          />
          <button
            className={`theme-btn ${theme === 'sunset' ? 'active' : ''}`}
            onClick={() => setTheme('sunset')}
            style={{ background: '#451a2b' }}
            title="Sunset"
          />
          <button
            className={`theme-btn ${theme === 'ocean' ? 'active' : ''}`}
            onClick={() => setTheme('ocean')}
            style={{ background: '#0c4a6e' }}
            title="Ocean"
          />
          <button
            className={`theme-btn ${theme === 'daylight' ? 'active' : ''}`}
            onClick={() => setTheme('daylight')}
            style={{ background: '#f59e0b' }}
            title="Daylight (Optimistic)"
          />
        </div>
      </div>

      <ImageConverter />
    </div>
  );
}

export default App;
