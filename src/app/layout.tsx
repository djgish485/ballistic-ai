import './globals.css'
import { Inter } from 'next/font/google'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Superhero App',
  description: 'AI-powered code analysis assistant',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script src="http://localhost:8097" strategy="afterInteractive" />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}