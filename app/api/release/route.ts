import {SESSIONS_RELEASE} from '@/lib/release-info';

export const dynamic='force-dynamic';

export async function GET(){
  return Response.json(SESSIONS_RELEASE,{
    headers:{
      'Cache-Control':'public, max-age=60, must-revalidate',
      'X-Sessions-Release':SESSIONS_RELEASE.id,
    },
  });
}
