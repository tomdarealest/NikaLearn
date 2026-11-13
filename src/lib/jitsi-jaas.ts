import jwt from 'jsonwebtoken';

export type JaasConfig = {
  appId: string;
  apiKey: string;
  apiKeyId: string;
};

export function getJaasConfig(): JaasConfig | null {
  const appId = process.env.JITSI_JAAS_APP_ID?.trim();
  const apiKey = process.env.JITSI_JAAS_API_KEY?.trim();
  const apiKeyId = process.env.JITSI_JAAS_API_KEY_ID?.trim() || apiKey;
  if (!appId || !apiKey) return null;
  return { appId, apiKey, apiKeyId: apiKeyId! };
}

export function createJaasToken(params: {
  config: JaasConfig;
  roomName: string;
  userName: string;
  userEmail: string;
  isModerator: boolean;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: 'jitsi',
    iss: 'chat',
    sub: params.config.appId,
    room: params.roomName,
    exp: now + 60 * 60 * 2,
    nbf: now - 10,
    context: {
      user: {
        id: params.userEmail || params.userName,
        name: params.userName,
        email: params.userEmail || `${params.userName}@nikalearn.local`,
        moderator: params.isModerator ? 'true' : 'false',
      },
      features: {
        livestreaming: 'false',
        'outbound-call': 'false',
        transcription: 'false',
        recording: 'false',
      },
    },
  };

  return jwt.sign(payload, params.config.apiKey, {
    algorithm: 'HS256',
    header: {
      alg: 'HS256',
      kid: params.config.apiKeyId,
      typ: 'JWT',
    },
  });
}

export function getJaasRoomName(appId: string, roomName: string): string {
  return `${appId}/${roomName}`;
}
