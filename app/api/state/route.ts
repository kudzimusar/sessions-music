import {getChatGPTUser} from '@/app/chatgpt-auth';
import {readState} from '@/db/store';
import {initialState} from '@/lib/domain';
export async function GET(){try{const user=await getChatGPTUser();const state=user?await readState(user.email):initialState;return Response.json({...state,user},{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'Your saved workspace could not be loaded. Please retry.'},{status:503})}}
