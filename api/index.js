// ============================================
// ADSM Diş Hekimliği API - ana giriş noktası
gelistirici: 'Dt. Bilal Yıldırım',
iletisim: '@DtBilalYildirim',
// ============================================

const symptoms = require('../data/symptoms.json');
const prescriptions = require('../data/prescriptions.json');

let records = [];

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const query = url.searchParams;

  // ─── GET /api ───
  if (path === '/api' || path === '/api/') {
    return res.status(200).json({
      mesaj: '🦷 ADSM Diş Hekimliği API - Aktif',
      versiyon: '1.0.0',
      endpointler: {
        'GET /api/symptoms?q=ağrı': 'Semptomlara göre ICD-10 kodu önerir',
        'GET /api/prescription/:icd10': 'Teşhise göre reçete şablonu getirir',
        'POST /api/records': 'Reçete kaydeder (JSON body gerekli)',
        'GET /api/records': 'Tüm kayıtları listeler',
        'GET /api/records?tc=12345678901': 'TC kimliğine göre sorgular',
      },
    });
  }

  // ─── GET /api/symptoms ───
  if (path === '/api/symptoms' && req.method === 'GET') {
    const q = (query.get('q') || '').toLowerCase().trim();
    if (!q) {
      return res.status(400).json({ hata: "'q' parametresi zorunludur. Örnek: /api/symptoms?q=ağrı" });
    }

    const sonuclar = symptoms.filter(s =>
      s.semptomlar.some(sem => sem.toLowerCase().includes(q)) ||
      s.tani.toLowerCase().includes(q)
    );

    if (sonuclar.length === 0) {
      return res.status(404).json({ mesaj: 'Eşleşen tanı bulunamadı.', aranan: q });
    }

    return res.status(200).json({ toplam: sonuclar.length, sonuclar });
  }

  // ─── GET /api/prescription/:icd10 ───
  const prescMatch = path.match(/^\/api\/prescription\/(.+)$/);
  if (prescMatch && req.method === 'GET') {
    const icd10 = prescMatch[1].toUpperCase();
    const sablon = prescriptions[icd10];

    if (!sablon) {
      return res.status(404).json({
        hata: `'${icd10}' kodu için reçete şablonu bulunamadı.`,
        ipucu: 'Önce /api/symptoms ile ICD-10 kodunu öğrenin.',
      });
    }

    return res.status(200).json({ icd10, ...sablon });
  }

  // ─── POST /api/records ───
  if (path === '/api/records' && req.method === 'POST') {
    const body = req.body;

    if (!body || !body.tc || !body.icd10) {
      return res.status(400).json({
        hata: 'Eksik alan. Zorunlu alanlar: tc, icd10',
        ornek: { tc: '12345678901', icd10: 'K04.0', notlar: 'İsteğe bağlı notlar' },
      });
    }

    const kayit = {
      id: Date.now(),
      tarih: new Date().toLocaleString('tr-TR'),
      tc: body.tc,
      icd10: body.icd10.toUpperCase(),
      notlar: body.notlar || '',
      reçete: prescriptions[body.icd10.toUpperCase()] || null,
    };

    records.push(kayit);
    return res.status(201).json({ mesaj: 'Kayıt oluşturuldu.', kayit });
  }

  // ─── GET /api/records ───
  if (path === '/api/records' && req.method === 'GET') {
    const tc = query.get('tc');
    const sonuc = tc ? records.filter(r => r.tc === tc) : records;

    return res.status(200).json({
      toplam: sonuc.length,
      kayitlar: sonuc,
    });
  }

  // ─── 404 ───
  return res.status(404).json({
    hata: 'Bu endpoint bulunamadı.',
    anasayfa: '/api',
  });
};
