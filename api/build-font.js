// 실제 폰트 파일 빌드/서빙 엔드포인트
// Google Fonts가 실제로 배포하는 정품 폰트 바이너리(.ttf/.woff2)를 서버에서 직접 가져와서
// 우리 도메인에서 바로 다운로드되도록 재포장한다. (새 폰트를 생성하는 게 아니라, 선택한 스타일의
// 진짜 폰트 파일을 우리 사이트에서 원클릭으로 받게 해주는 실제 동작 엔드포인트)

const LEGACY_UA = 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)'; // Google Fonts가 .ttf 링크를 주도록 유도
const MODERN_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'; // Google Fonts가 .woff2 링크를 주도록 유도 (짧은 UA는 인식이 안 돼 무시하고 다시 ttf로 폴백됨)

module.exports = async (req, res) => {
  const { family, weight = '400', format = 'ttf' } = req.query;

  if (!family) {
    res.status(400).json({ error: 'family 파라미터가 필요합니다.' });
    return;
  }

  try {
    const familyParam = encodeURIComponent(family) + (weight ? `:wght@${weight}` : '');
    const cssUrl = `https://fonts.googleapis.com/css2?family=${familyParam}&display=swap`;

    const cssRes = await fetch(cssUrl, {
      headers: { 'User-Agent': format === 'ttf' ? LEGACY_UA : MODERN_UA },
    });
    if (!cssRes.ok) throw new Error(`Google Fonts CSS 조회 실패 (HTTP ${cssRes.status})`);
    const css = await cssRes.text();

    const urlMatch = css.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/);
    if (!urlMatch) throw new Error('폰트 파일 URL을 CSS에서 찾지 못했습니다.');
    const fontUrl = urlMatch[1];

    const fontRes = await fetch(fontUrl);
    if (!fontRes.ok) throw new Error(`폰트 바이너리 다운로드 실패 (HTTP ${fontRes.status})`);
    const buf = Buffer.from(await fontRes.arrayBuffer());

    const ext = fontUrl.endsWith('.woff2') ? 'woff2' : fontUrl.endsWith('.woff') ? 'woff' : 'ttf';
    const safeName = family.replace(/[^a-zA-Z0-9가-힣]/g, '');
    const filename = `${safeName}_${weight}.${ext}`;

    res.setHeader('Content-Type', ext === 'woff2' ? 'font/woff2' : ext === 'woff' ? 'font/woff' : 'font/ttf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(buf);
  } catch (err) {
    res.status(500).json({ error: '폰트 파일을 가져오는 중 오류가 발생했습니다.', detail: err.message });
  }
};
