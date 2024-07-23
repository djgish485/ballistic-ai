import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Superhero App',
  description: 'AI-powered code analysis assistant',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="http://localhost:8097"></script>
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
