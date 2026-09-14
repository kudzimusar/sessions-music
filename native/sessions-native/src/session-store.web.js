export async function readNativeAccessToken(){return null}
export async function readNativeSessionMeta(){return null}
export async function persistVerifiedSupabaseSession(){throw new Error('Browser UAT projection cannot persist native authentication material.')}
export async function clearNativeSession(){}
