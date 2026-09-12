import {authenticateSupabase} from '@/lib/supabase-identity';

const COOKIE='__Host-sessions_access';
const response=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','X-Content-Type-Options':'nosniff',...headers}});
const sameOrigin=(request:Request)=>{const origin=request.headers.get('origin');return !origin||origin===new URL(request.url).origin};

export async function POST(request:Request){
 if(!sameOrigin(request))return response({error:'Cross-origin request rejected.'},403);
 const auth=request.headers.get('authorization')||'';
 if(!auth.startsWith('Bearer ')||auth.length>20_000)return response({error:'A verified Sessions access token is required.'},401);
 const principal=await authenticateSupabase(request.headers);
 if(!principal)return response({error:'The Sessions access token could not be verified.'},401);
 const token=auth.slice(7).trim();
 const seconds=Math.max(1,Math.min(3600,Math.floor((principal.expiresAt-Date.now())/1000)));
 return response({ok:true,expiresAt:new Date(principal.expiresAt).toISOString()},200,{'Set-Cookie':`${COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${seconds}; HttpOnly; Secure; SameSite=Lax`});
}

export async function DELETE(request:Request){
 if(!sameOrigin(request))return response({error:'Cross-origin request rejected.'},403);
 return response({ok:true},200,{'Set-Cookie':`${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`});
}
