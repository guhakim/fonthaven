// 구글이 로그인 완료 후 돌려주는 code를 받아서, 토큰 교환 -> 사용자 정보 조회 -> 로그인 쿠키 발급
const { sign } = require('../../_session.js');

module.exports = async (req, res) => {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const code = url.searchParams.get('code');

  if (!code) {
    res.writeHead(302, { Location: '/?login=failed' });
    return res.end();
  }

  const redirectUri = `https://${req.headers.host}/api/auth/google/callback`;

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokenData.error_description || '토큰 교환 실패');

    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = await userRes.json();
    if (!userRes.ok) throw new Error('사용자 정보 조회 실패');

    const sessionToken = sign({
      email: user.email,
      name: user.name,
      picture: user.picture,
      loggedInAt: Date.now(),
    });

    res.setHeader('Set-Cookie', [
      `session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`,
    ]);
    res.writeHead(302, { Location: '/?login=success' });
    res.end();
  } catch (err) {
    console.error('구글 로그인 실패:', err.message);
    res.writeHead(302, { Location: '/?login=failed' });
    res.end();
  }
};
