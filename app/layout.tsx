import type {Metadata,Viewport} from 'next';
import './globals.css';
import './registry.css';
export const metadata:Metadata={title:'Sessions',description:'Discover real Harare studios, meet their teams, claim your studio and manage music sessions.',icons:{icon:'/favicon.svg'},appleWebApp:{capable:true,title:'Sessions',statusBarStyle:'default'},manifest:'/manifest.webmanifest'};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#1F4E79'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
