'use client';
import {type ReactNode} from 'react';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {Checkbox} from '@/components/ui/checkbox';
import {Headphones} from 'lucide-react';
export function Choice({value,onChange,options,label}:{value:string;onChange:(v:string)=>void;options:(string|{value:string;label:string})[];label:string}){return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label}><SelectValue placeholder={label}/></SelectTrigger><SelectContent>{options.map(o=>{const v=typeof o==='string'?o:o.value;return <SelectItem key={v} value={v}>{typeof o==='string'?o:o.label}</SelectItem>})}</SelectContent></Select>}
export function Field({label,children,hint}:{label:string;children:ReactNode;hint?:string}){return <label className="r-field"><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label>}
export function CheckField({checked,onChange,children}:{checked:boolean;onChange:(v:boolean)=>void;children:ReactNode}){return <label className="r-check"><Checkbox checked={checked} onCheckedChange={v=>onChange(v===true)}/><span>{children}</span></label>}
export function Empty({title,children}:{title:string;children:ReactNode}){return <div className="r-empty"><Headphones size={28}/><h3>{title}</h3><p>{children}</p></div>}
export type RegistryAction=(payload:Record<string,unknown>,message?:string)=>Promise<any>;
