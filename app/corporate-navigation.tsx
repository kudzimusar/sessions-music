'use client';
import {usePathname} from 'next/navigation';
import {Landmark} from 'lucide-react';
import {visibleCorporateModules} from '@/lib/corporate-control-plane';

export default function CorporateNavigation({permissions}:{permissions:readonly string[]}){
 const path=usePathname();const modules=visibleCorporateModules(permissions);
 if(!modules.length)return null;
 return <nav className="c4-nav-shell" aria-label="Sessions corporate modules">
  <div className="c4-nav-brand"><a href="/corporate"><Landmark size={18}/><span>Sessions Corporate</span></a></div>
  <div className="c4-nav-scroll">{modules.map(module=>{const active=path===module.href;return <a key={module.id} href={module.href} className={active?'c4-nav-link active':'c4-nav-link'} aria-current={active?'page':undefined}>{module.shortTitle}</a>})}</div>
 </nav>;
}
