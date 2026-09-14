export const secureSupabaseStorage={
  async getItem(){return null;},
  async setItem(){throw new Error('Native Supabase session storage is unavailable in the browser verification projection.');},
  async removeItem(){},
};
