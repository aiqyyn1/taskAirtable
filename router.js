require('dotenv').config();
const Airtable = require('airtable');
const pdf = require('html-pdf');
const ejs = require('ejs');
const path = require('path');
const express = require('express');
const reportRouter = express.Router();
const puppeteer = require('puppeteer');
Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: process.env.API_KEY,
});
const base = Airtable.base(process.env.BASE);
const formatSumma = (summa) => {
  return (summa = summa
    .replace(new RegExp('^(\\d{1,2}|\\d{4})(\\d{3})', 'g'), '$1,$2')
    .replace(/(\d{3})(?=\d)(?!$)/g, '$1,')
    .trim());
};
const sanitizeFilename = (filename) => {
  // Remove invalid characters from the filename
  return filename.replace(/[^a-zA-Z0-9-_.]/g, '_');
};
const generatePdf = async (html, options) => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: await puppeteer.executablePath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  await page.setContent(html);
  const pdfBuffer = await page.pdf(options);

  await browser.close();

  return pdfBuffer;
};

reportRouter.get('/blanks', async (req, res) => {
  const recordID = req.query.recordID;

  try {
    const record = await findRecord(recordID);
    //  console.log(record)
    const esf = await fetchRecords(recordID);
 
    const name = record.get('Name');
    const sanitizedFilename = sanitizeFilename(name);
    const IP = record.get('ИП имя (from ИП)');
    // console.log(IP);
    const iik = record.get('счет (from ИП)');
    // console.log(iik);
    const kbe = record.get('кбе (from ИП)');
    // console.log(kbe);
    const bank = record.get('банк (from ИП)');
    // console.log(bank);
    const bik = record.get('БИК (from ИП)');
    const pechat = record.get('печать (from ИП)')[0].url;
    const rospis = record.get('роспись (from ИП)')[0].url;
    const cod = record.get('код назначения платежа (from ИП)');
    const nomer = record.get('номер');
    const bin = record.get('БИН (from ИП)');
    const bin2 = record.get('ИИН/БИН 3');
    const nameFirmy = record.get('название фирмы 3');
    const address2 = record.get('адрес 3');
    const address = record.get('адрес (from ИП)');
    const dogovor = record.get('договор для счет оплаты');

    const date = String(record.get('today')).split('-');
    const today = date[2] + '-' + date[1] + '-' + date[0];
    const itogoEsf = String(record.get('итого ЭСФ'));
    const col = record.get('кол-во наименований');
    const rukovaditel = record.get('руководитель (from ИП)');
    let airtableData = {
      IP: IP,
      IIK: iik,
      kbe: kbe,
      bank: bank,
      bik: bik,
      cod: cod,
      nomer: nomer,
      today: today,
      bin: bin,
      address: address,
      bin2: bin2,
      nameFirmy: nameFirmy,
      address2: address2,
      dogovor: dogovor,
      esf: esf,
      itogoEsf: formatSumma(itogoEsf),
      col: col,
      rukovaditel: rukovaditel,
      pechat: pechat,
      rospis: rospis,
      nomer: nomer,
    };
    const filename = name + '.pdf'
    const filePath = path.join(__dirname, './public/', filename);

    ejs.renderFile(
      path.join(__dirname, 'template.ejs'),
      { reportdata: airtableData },
      async (err, data) => {
        if (err) {
          console.log(err, 'Error in rendering template');
          res.status(500).send('Error in rendering template');
        } else {
          const options = {
            format: 'A4',
          };
          const pdfBuffer = await generatePdf(data, options);

          // Send the PDF as a download attachment
          res.setHeader('Content-Disposition', `attachment; filename=${sanitizedFilename}.pdf`);
          res.setHeader('Content-Type', 'application/pdf');
          res.status(200).end(pdfBuffer);
        }}
      
    );
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

const fetchRecords = (recordID) => {
  let esf = []
  return new Promise((resolve, reject) => {
    base('заказы подробно')
      .select({
        view: 'Aikyn',
      })
      .eachPage(
        function page(records, fetchNextPage) {
          try {
            records.forEach(function (record) {
              const id = record.get('record_id (from заказ номер)');
              
              id.map((recId) => {
                if (recId == recordID) {
                  const n = record.get('№');
          
                  const naimenovanie = record.get('Наименование1');
                  const esfCena = record.get('ЭСФ цена');
                  const kol_vo = record.get('Кол-во');
                  let summa = String(record.get('ЭСФ Сумма'));
                
                  esf.push({
                    Наименование: naimenovanie,
                    n: n,
                    efs1: esfCena,
                    kol_vo: kol_vo,
                    summa: formatSumma(summa),
                  });
           
                }
              });
            });
            resolve(esf);
          } catch (error) {
            reject(error);
          }
          fetchNextPage();
        },
      );
  });
}
const findRecord = (recordID) => {
  return new Promise((resolve, reject) => {
    base('заказы общее').find(recordID, (err, record) => {
      if (err) {
        reject(err);
      } else {
        resolve(record);
      }
    });
  });
};

module.exports = reportRouter;
