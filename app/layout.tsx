import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "react-hot-toast"

export const metadata: Metadata = {
  title: "Rights Tracker - Credit & Loan Management System",
  description: "Comprehensive credit tracking, login desk management, and MIS reporting system",
  keywords: "credit tracker, loan management, MIS tracker, banking",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#ffffff',
              color: '#0f172a',
              border: '1px solid #dbeafe',
              borderRadius: '10px',
              fontSize: '13.5px',
              fontWeight: '500',
              boxShadow: '0 4px 20px rgba(37,99,235,0.12)',
            },
            success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
          }}
        />
        {children}
      </body>
    </html>
  )
}
