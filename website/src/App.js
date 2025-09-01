import React, { useState, useEffect, useRef } from 'react';

function App() {
  const [dark, setDark] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('geminiKey') || '');
  const [loading, setLoading] = useState(false);
  const [bodyPreview, setBodyPreview] = useState(() => localStorage.getItem('bodyPreview') || null);
  const [clothPreview, setClothPreview] = useState(() => localStorage.getItem('clothPreview') || null);
  const [resultPreview, setResultPreview] = useState(null);

  const bodyInputRef = useRef(null);
  const clothInputRef = useRef(null);

  const toggleTheme = () => {
    const root = document.documentElement;
    if (dark) {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
    setDark(!dark);
  };

  const handleTry = async () => {
    if (!bodyPreview || !clothPreview) {
      alert('Upload both body and clothing images first.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3125/tryon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: bodyPreview,
          cloth: clothPreview,
          apiKey,
        }),
      });
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      setResultPreview(data.result || null);
    } catch (err) {
      console.error(err);
      alert('Request failed. Check the server console.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyChange = (e) => {
    setApiKey(e.target.value);
    localStorage.setItem('geminiKey', e.target.value);
  };

  const readFile = (file, cb) => {
    const reader = new FileReader();
    reader.onload = () => cb(reader.result);
    reader.readAsDataURL(file);
  };

  const handleBodyFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result;
      setBodyPreview(data);
      localStorage.setItem('bodyPreview', data);
    };
    reader.readAsDataURL(file);
  };

  const handleClothFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result;
      setClothPreview(data);
      localStorage.setItem('clothPreview', data);
    };
    reader.readAsDataURL(file);
  };

  const handleBodyDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    readFile(file, (data) => {
      setBodyPreview(data);
      localStorage.setItem('bodyPreview', data);
    });
  };

  const handleClothDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    readFile(file, (data) => {
      setClothPreview(data);
      localStorage.setItem('clothPreview', data);
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const targetType = e.currentTarget.dataset.type;
    readFile(file, (data) => {
      if (targetType === 'body') {
        setBodyPreview(data);
        localStorage.setItem('bodyPreview', data);
      } else {
        setClothPreview(data);
        localStorage.setItem('clothPreview', data);
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white text-black dark:bg-black dark:text-white transition-colors duration-300">
      {/* Top control bar */}
      <div className="fixed top-2 left-1/2 -translate-x-1/2 flex items-center gap-4">
        <input
          type="password"
          value={apiKey}
          onChange={handleKeyChange}
          placeholder="Gemini API Key"
          className="px-3 py-1 border-2 border-black dark:border-white rounded font-hand bg-white dark:bg-black text-black dark:text-white"
        />
        <button
          onClick={toggleTheme}
          className="px-4 py-1 border-2 border-black dark:border-white rounded font-hand"
        >
          {dark ? 'Light mode' : 'Dark mode'}
        </button>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-center gap-8 w-full max-w-5xl mx-auto">
        {/* Drop zones */}
        <div className="flex flex-col gap-4 items-center">
          <div onDragOver={(e)=>e.preventDefault()} onDrop={handleBodyDrop} className="w-64 h-64 border-2 border-dotted border-black dark:border-white flex items-center justify-center overflow-hidden">
            {bodyPreview ? (
              <img src={bodyPreview} alt="Body" className="object-contain w-full h-full" />
            ) : (
              <p className="text-center font-hand">Drag n drop<br />the body image here!</p>
            )}
          </div>
          <input type="file" accept="image/*" ref={bodyInputRef} onChange={handleBodyFile} className="hidden" />
          <button onClick={() => bodyInputRef.current?.click()} className="px-3 py-1 border-2 border-black dark:border-white rounded font-hand transition hover:scale-105 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black">Upload body</button>
          <div onDragOver={(e)=>e.preventDefault()} onDrop={handleClothDrop} className="w-64 h-64 border-2 border-dotted border-black dark:border-white flex items-center justify-center overflow-hidden">
            {clothPreview ? (
              <img src={clothPreview} alt="Clothing" className="object-contain w-full h-full" />
            ) : (
              <p className="text-center font-hand">Drag n drop<br />the clothing item<br />you want to try here!</p>
            )}
          </div>
          <input type="file" accept="image/*" ref={clothInputRef} onChange={handleClothFile} className="hidden" />
          <button onClick={() => clothInputRef.current?.click()} className="px-3 py-1 border-2 border-black dark:border-white rounded font-hand transition hover:scale-105 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black">Upload clothing</button>
        </div>

        {/* Arrow and button */}
        <div className="flex flex-col items-center">
          <svg className="w-24 h-24 stroke-black dark:stroke-white rotate-90 md:rotate-0" fill="none" strokeWidth="4" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h15m0 0-6-6m6 6-6 6" />
          </svg>
          <button
            onClick={handleTry}
            className="mt-2 px-4 py-2 border-2 border-black dark:border-white rounded font-hand transition transform hover:scale-105 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
          >
            Try it on!
          </button>
        </div>

        {/* Result pane */}
        <div className="w-72 h-96 border-2 border-black dark:border-white flex items-center justify-center overflow-hidden">
          {loading ? (
              <span className="font-hand animate-pulse">Loading...</span>
            ) : resultPreview ? (
              <img src={resultPreview} alt="Result" className="object-contain w-full h-full" />
            ) : (
              <span className="font-hand text-center">Result will appear here</span>
            )}
        </div>
      </div>
    </div>
  );
}

export default App;
