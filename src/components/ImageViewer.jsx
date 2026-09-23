import { useEffect } from 'react'

function ImageViewer({ src, alt, onClose }) {
  useEffect(() => {
    if (!src) return
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [src, onClose])

  if (!src) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 60 }}
      onClick={onClose}
    >
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.85)' }}
      />
      <button
        onClick={onClose}
        className="absolute top-4 right-4 flex items-center justify-center rounded-full"
        style={{
          zIndex: 61,
          width: '40px',
          height: '40px',
          background: 'rgba(255,255,255,0.15)',
          border: 'none',
          cursor: 'pointer',
          color: '#fff',
          fontSize: '20px',
          backdropFilter: 'blur(4px)',
        }}
        aria-label="Kapat"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
      <img
        src={src}
        alt={alt}
        className="relative"
        style={{
          maxWidth: '100vw',
          maxHeight: '100vh',
          objectFit: 'contain',
          borderRadius: '8px',
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

export default ImageViewer
