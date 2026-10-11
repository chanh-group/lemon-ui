type VerificationMessageProps = {
  tone: 'info' | 'error' | 'success'
  children: string
}

export default function VerificationMessage({
  tone,
  children,
}: VerificationMessageProps) {
  return (
    <div
      className={`verification-message verification-message-${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <span className="verification-message-icon">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {tone === 'success' ? (
            <path d="m5 12 4 4L19 6" />
          ) : (
            <>
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </>
          )}
        </svg>
      </span>
      <span>{children}</span>
    </div>
  )
}
