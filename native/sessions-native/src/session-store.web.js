export async function readNativeAccessToken(){return null}
export async function readNativeSessionMeta(){return null}
export async function persistVerifiedSupabaseSession(){throw new Error('Browser UAT projection cannot persist native authentication material.')}
export const nativeSupabaseStorage={
  async getItem(){return null},
  async setItem(){throw new Error('Browser UAT projection cannot persist native authentication material.')},
  async removeItem(){},
};
export async function clearNativeSession(){}
