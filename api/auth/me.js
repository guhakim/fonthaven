// 지금 로그인된 사용자가 있는지 프론트엔드가 확인하는 엔드포인트
const { verify, parseCookies } = require('../_session.js');

module.exports = async (req, res) => {
  const cookies = parseCookies(req);
  const user = verify(cookies.session);
  if (!user) {
    res.status(200).json({ loggedIn: false });
    return;
  }
  res.status(200).json({ loggedIn: true, email: user.email, name: user.name, picture: user.picture });
};
