import { NextRequest } from 'next/server';
import { POST as oauthSyncPost } from '../../oauth/sync/route';

export async function POST(request: NextRequest) {
  return oauthSyncPost(request);
}
