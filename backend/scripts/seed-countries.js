/**
 * Adds missing countries to the `countries` master table (used by the
 * Country dropdown via getCountryDD). Insert-only: existing rows are never
 * updated or deleted; a country is skipped when its shortname (ISO code) or
 * name already exists.
 *
 * Usage:
 *   node scripts/seed-countries.js           # dry run, prints what would be added
 *   node scripts/seed-countries.js --apply   # inserts the missing countries
 */
require('dotenv').config();
const { Client } = require('pg');

const APPLY = process.argv.includes('--apply');

// [ISO 3166-1 alpha-2, name, international dialling code]
const COUNTRIES = [
  ['AF', 'Afghanistan', 93], ['AL', 'Albania', 355], ['DZ', 'Algeria', 213],
  ['AD', 'Andorra', 376], ['AO', 'Angola', 244], ['AG', 'Antigua and Barbuda', 1268],
  ['AR', 'Argentina', 54], ['AM', 'Armenia', 374], ['AU', 'Australia', 61],
  ['AT', 'Austria', 43], ['AZ', 'Azerbaijan', 994], ['BS', 'Bahamas', 1242],
  ['BH', 'Bahrain', 973], ['BD', 'Bangladesh', 880], ['BB', 'Barbados', 1246],
  ['BY', 'Belarus', 375], ['BE', 'Belgium', 32], ['BZ', 'Belize', 501],
  ['BJ', 'Benin', 229], ['BT', 'Bhutan', 975], ['BO', 'Bolivia', 591],
  ['BA', 'Bosnia and Herzegovina', 387], ['BW', 'Botswana', 267], ['BR', 'Brazil', 55],
  ['BN', 'Brunei', 673], ['BG', 'Bulgaria', 359], ['BF', 'Burkina Faso', 226],
  ['BI', 'Burundi', 257], ['CV', 'Cabo Verde', 238], ['KH', 'Cambodia', 855],
  ['CM', 'Cameroon', 237], ['CA', 'Canada', 1], ['CF', 'Central African Republic', 236],
  ['TD', 'Chad', 235], ['CL', 'Chile', 56], ['CN', 'China', 86],
  ['CO', 'Colombia', 57], ['KM', 'Comoros', 269], ['CG', 'Congo', 242],
  ['CD', 'Congo (Democratic Republic)', 243], ['CR', 'Costa Rica', 506], ['CI', "Cote d'Ivoire", 225],
  ['HR', 'Croatia', 385], ['CU', 'Cuba', 53], ['CY', 'Cyprus', 357],
  ['CZ', 'Czech Republic', 420], ['DK', 'Denmark', 45], ['DJ', 'Djibouti', 253],
  ['DM', 'Dominica', 1767], ['DO', 'Dominican Republic', 1809], ['EC', 'Ecuador', 593],
  ['EG', 'Egypt', 20], ['SV', 'El Salvador', 503], ['GQ', 'Equatorial Guinea', 240],
  ['ER', 'Eritrea', 291], ['EE', 'Estonia', 372], ['SZ', 'Eswatini', 268],
  ['ET', 'Ethiopia', 251], ['FJ', 'Fiji', 679], ['FI', 'Finland', 358],
  ['FR', 'France', 33], ['GA', 'Gabon', 241], ['GM', 'Gambia', 220],
  ['GE', 'Georgia', 995], ['DE', 'Germany', 49], ['GH', 'Ghana', 233],
  ['GR', 'Greece', 30], ['GD', 'Grenada', 1473], ['GT', 'Guatemala', 502],
  ['GN', 'Guinea', 224], ['GW', 'Guinea-Bissau', 245], ['GY', 'Guyana', 592],
  ['HT', 'Haiti', 509], ['HN', 'Honduras', 504], ['HK', 'Hong Kong', 852],
  ['HU', 'Hungary', 36], ['IS', 'Iceland', 354], ['IN', 'India', 91],
  ['ID', 'Indonesia', 62], ['IR', 'Iran', 98], ['IQ', 'Iraq', 964],
  ['IE', 'Ireland', 353], ['IL', 'Israel', 972], ['IT', 'Italy', 39],
  ['JM', 'Jamaica', 1876], ['JP', 'Japan', 81], ['JO', 'Jordan', 962],
  ['KZ', 'Kazakhstan', 7], ['KE', 'Kenya', 254], ['KI', 'Kiribati', 686],
  ['XK', 'Kosovo', 383], ['KW', 'Kuwait', 965], ['KG', 'Kyrgyzstan', 996],
  ['LA', 'Laos', 856], ['LV', 'Latvia', 371], ['LB', 'Lebanon', 961],
  ['LS', 'Lesotho', 266], ['LR', 'Liberia', 231], ['LY', 'Libya', 218],
  ['LI', 'Liechtenstein', 423], ['LT', 'Lithuania', 370], ['LU', 'Luxembourg', 352],
  ['MO', 'Macao', 853], ['MG', 'Madagascar', 261], ['MW', 'Malawi', 265],
  ['MY', 'Malaysia', 60], ['MV', 'Maldives', 960], ['ML', 'Mali', 223],
  ['MT', 'Malta', 356], ['MH', 'Marshall Islands', 692], ['MR', 'Mauritania', 222],
  ['MU', 'Mauritius', 230], ['MX', 'Mexico', 52], ['FM', 'Micronesia', 691],
  ['MD', 'Moldova', 373], ['MC', 'Monaco', 377], ['MN', 'Mongolia', 976],
  ['ME', 'Montenegro', 382], ['MA', 'Morocco', 212], ['MZ', 'Mozambique', 258],
  ['MM', 'Myanmar', 95], ['NA', 'Namibia', 264], ['NR', 'Nauru', 674],
  ['NP', 'Nepal', 977], ['NL', 'Netherlands', 31], ['NZ', 'New Zealand', 64],
  ['NI', 'Nicaragua', 505], ['NE', 'Niger', 227], ['NG', 'Nigeria', 234],
  ['KP', 'North Korea', 850], ['MK', 'North Macedonia', 389], ['NO', 'Norway', 47],
  ['OM', 'Oman', 968], ['PK', 'Pakistan', 92], ['PW', 'Palau', 680],
  ['PS', 'Palestine', 970], ['PA', 'Panama', 507], ['PG', 'Papua New Guinea', 675],
  ['PY', 'Paraguay', 595], ['PE', 'Peru', 51], ['PH', 'Philippines', 63],
  ['PL', 'Poland', 48], ['PT', 'Portugal', 351], ['PR', 'Puerto Rico', 1787],
  ['QA', 'Qatar', 974], ['RO', 'Romania', 40], ['RU', 'Russia', 7],
  ['RW', 'Rwanda', 250], ['KN', 'Saint Kitts and Nevis', 1869], ['LC', 'Saint Lucia', 1758],
  ['VC', 'Saint Vincent and the Grenadines', 1784], ['WS', 'Samoa', 685], ['SM', 'San Marino', 378],
  ['ST', 'Sao Tome and Principe', 239], ['SA', 'Saudi Arabia', 966], ['SN', 'Senegal', 221],
  ['RS', 'Serbia', 381], ['SC', 'Seychelles', 248], ['SL', 'Sierra Leone', 232],
  ['SG', 'Singapore', 65], ['SK', 'Slovakia', 421], ['SI', 'Slovenia', 386],
  ['SB', 'Solomon Islands', 677], ['SO', 'Somalia', 252], ['ZA', 'South Africa', 27],
  ['KR', 'South Korea', 82], ['SS', 'South Sudan', 211], ['ES', 'Spain', 34],
  ['LK', 'Sri Lanka', 94], ['SD', 'Sudan', 249], ['SR', 'Suriname', 597],
  ['SE', 'Sweden', 46], ['CH', 'Switzerland', 41], ['SY', 'Syria', 963],
  ['TW', 'Taiwan', 886], ['TJ', 'Tajikistan', 992], ['TZ', 'Tanzania', 255],
  ['TH', 'Thailand', 66], ['TL', 'Timor-Leste', 670], ['TG', 'Togo', 228],
  ['TO', 'Tonga', 676], ['TT', 'Trinidad and Tobago', 1868], ['TN', 'Tunisia', 216],
  ['TR', 'Turkey', 90], ['TM', 'Turkmenistan', 993], ['TV', 'Tuvalu', 688],
  ['UG', 'Uganda', 256], ['UA', 'Ukraine', 380], ['AE', 'United Arab Emirates', 971],
  ['GB', 'United Kingdom', 44], ['US', 'United States', 1], ['UY', 'Uruguay', 598],
  ['UZ', 'Uzbekistan', 998], ['VU', 'Vanuatu', 678], ['VA', 'Vatican City', 379],
  ['VE', 'Venezuela', 58], ['VN', 'Vietnam', 84], ['YE', 'Yemen', 967],
  ['ZM', 'Zambia', 260], ['ZW', 'Zimbabwe', 263],
];

const client = new Client({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT),
});

async function run() {
  await client.connect();

  const existing = await client.query('SELECT shortname, name FROM countries');
  const codes = new Set(existing.rows.map((r) => String(r.shortname || '').toUpperCase()));
  const names = new Set(existing.rows.map((r) => String(r.name || '').trim().toLowerCase()));

  const missing = COUNTRIES.filter(
    ([code, name]) => !codes.has(code) && !names.has(name.toLowerCase()),
  );

  console.log(`Existing countries: ${existing.rows.length}. Missing: ${missing.length}.`);
  if (!missing.length) return;

  if (!APPLY) {
    console.log('Dry run — would add:', missing.map(([, name]) => name).join(', '));
    console.log('Re-run with --apply to insert them.');
    return;
  }

  await client.query('BEGIN');
  try {
    // Existing rows may have been loaded with explicit ids; move the id
    // sequence past them (forward only) so new inserts don't collide.
    const seq = await client.query(`SELECT pg_get_serial_sequence('countries', 'id') AS name`);
    if (seq.rows[0]?.name) {
      await client.query(
        `SELECT setval($1, GREATEST((SELECT COALESCE(MAX(id), 0) FROM countries), (SELECT last_value FROM ${seq.rows[0].name})))`,
        [seq.rows[0].name],
      );
    }
    for (const [code, name, phonecode] of missing) {
      await client.query(
        'INSERT INTO countries (shortname, name, phonecode) VALUES ($1, $2, $3)',
        [code, name, phonecode],
      );
    }
    await client.query('COMMIT');
    console.log(`Inserted ${missing.length} countries.`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

run()
  .catch((err) => {
    console.error('Country seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => client.end());
