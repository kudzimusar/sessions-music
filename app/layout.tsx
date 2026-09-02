import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Sessions',description:'Find your next session. Discover music-ready rehearsal spaces in Harare, choose your time and book. An interactive marketplace demo.',icons:{icon:'/favicon.svg'},manifest:'/manifest.webmanifest'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
