function Spinner() {
  return (
    <svg
      data-testid="spinner"
      viewBox="0 0 24 24"
      className="w-6 h-6 text-current"
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="50 20"
      />
    </svg>
  )
}

export default Spinner
