import type {Metadata,Viewport} from 'next';
import './globals.css';
import './registry.css';
import './expansion.css';
import './polish.css';
const siteOrigin='https://sessions-music.kudzimusar.chatgpt.site';
const description='Find music-ready rehearsal spaces in Zimbabwe by location, equipment, group size and time. Sessions makes music infrastructure searchable, bookable and easier to trust.';
export const metadata:Metadata={metadataBase:new URL(siteOrigin),title:'Sessions',description,openGraph:{title:'Sessions',description,images:[{url:siteOrigin+'/og.png',width:1730,height:909,alt:'Sessions — Find your sound. Find your space. Harare, Zimbabwe.'}]},twitter:{card:'summary_large_image',title:'Sessions',description,images:[siteOrigin+'/og.png']},icons:{icon:'/favicon.svg'},appleWebApp:{capable:true,title:'Sessions',statusBarStyle:'default'},manifest:'/manifest.webmanifest'};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#1F4E79'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
