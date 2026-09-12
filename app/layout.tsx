import type {Metadata,Viewport} from 'next';
import ProductionRouteGuard from './production-route-guard';
import {SESSIONS_RELEASE} from '@/lib/release-info';
import './globals.css';
import './registry.css';
import './expansion.css';
import './polish.css';
import './sessions-v2.css';
import './corporate-v4.css';
import './brand-v1.css';
import './brand-runtime.css';
const siteOrigin='https://sessions-music.kudzimusar.chatgpt.site';
const description='Find music-ready rehearsal spaces in Zimbabwe by location, equipment, group size and time. Sessions makes music infrastructure searchable, bookable and easier to trust.';
export const metadata:Metadata={metadataBase:new URL(siteOrigin),title:'Sessions',description,openGraph:{title:'Sessions',description,images:[]},twitter:{card:'summary',title:'Sessions',description,images:[]},icons:{icon:'/favicon.svg'},appleWebApp:{capable:true,title:'Sessions',statusBarStyle:'default'},manifest:'/manifest.webmanifest',other:{'sessions-release':SESSIONS_RELEASE.id,'sessions-phase':String(SESSIONS_RELEASE.phase),'sessions-brand':SESSIONS_RELEASE.brand}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#4169E1'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body data-sessions-brand="v1" data-sessions-release={SESSIONS_RELEASE.id}><ProductionRouteGuard/>{children}</body></html>}
