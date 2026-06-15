const path = require('path');
const fs = require('fs');

const symptomsPath = path.join(process.cwd(), 'data', 'symptoms.json');
const prescriptionsPath = path.join(process.cwd(), 'data', 'prescriptions.json');

const symptoms = JSON.parse(fs.readFileSync(symptomsPath, 'utf8'));
const prescriptions = JSON.parse(fs.readFileSync(prescriptionsPath, 'utf8'));

let records = [];

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;
  const query = url.searchParams;

  if (p === '/api' || p === '/api/' || p === '/') {
    return res.status(200).json({
      mesaj: '🦷 ADSM Diş Hekimliği API - Aktif',
      versiyon: '1.0.0',
      gelistirici: 'Dt. Bilal Yıldırım',
      iletisim: '@DtBilalYildirim',
      endpointler: {
        'GET /api/symptoms?q=ağrı': 'ICD-10 kodu önerir',
        'GET /api/prescription/:icd10': 'Reçete şablonu getirir',
        'POST /api/records': 'Reçete kaydeder',
        'GET /api/records': 'Kayıtları listeler',
      },
    });
  }

  if (p === '/api/symptoms' && req.method === 'GET') {
    const q = (query.get('q') || '').toLowerCase().trim();
    if (!q) return res.status(400).json({ hata: "'q' parametresi zorunludur." });
    const sonuclar = symptoms.filter(s =>
      s.semptomlar.some(sem => sem.toLowerCase().includes(q)) ||
      s.tani.toLowerCase().includes(q)
    );
    if (sonuclar.length === 0) return res.status(404).json({ mesaj: 'Bulunamadı.', aranan: q });
    return res.status(200).json({ toplam: sonuclar.length, sonuclar });
  }

  const prescMatch = p.match(/^\/api\/prescription\/(.+)$/);
  if (prescMatch && req.method === 'GET') {
    const icd10 = prescMatch[1].toUpperCase();
    const sablon = prescriptions[icd10];
    if (!sablon) return res.status(404).json({ hata: `'${icd10}' için şablon bulunamadı.` });
    return res.status(200).json({ icd10, ...sablon });
  }

  if (p === '/api/records' && req.method === 'POST') {
    const body = req.body;
    if (!body || !body.tc || !body.icd10) {
      return res.status(400).json({ hata: 'Zorunlu alanlar: tc, icd10' });
    }
    const kayit = {
      id: Date.now(),
      tarih: new Date().toLocaleString('tr-TR'),
      tc: body.tc,
      icd10: body.icd10.toUpperCase(),
      notlar: body.notlar || '',
      recete: prescriptions[body.icd10.toUpperCase()] || null,
    };
    records.push(kayit);
    return res.status(201).json({ mesaj: 'Kayıt oluşturuldu.', kayit });
  }

  if (p === '/api/records' && req.method === 'GET') {
    const tc = query.get('tc');
    const sonuc = tc ? records.filter(r => r.tc === tc) : records;
    return res.status(200).json({ toplam: sonuc.length, kayitlar: sonuc });
  }

  return res.status(404).json({ hata: 'Endpoint bulunamadı.', anasayfa: '/api' });
};
