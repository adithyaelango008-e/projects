require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// ─── Twilio Setup ────────────────────────────────────────────────────────────
let twilioClient = null;
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;

const twilioConfigured =
  TWILIO_SID && !TWILIO_SID.startsWith('AC' + 'xxx') &&
  TWILIO_TOKEN && TWILIO_TOKEN !== 'your_auth_token_here';

if (twilioConfigured) {
  const twilio = require('twilio');
  twilioClient = twilio(TWILIO_SID, TWILIO_TOKEN);
  console.log('✅ Twilio SMS enabled');
} else {
  console.log('⚠️  Twilio not configured — OTPs will be printed to console');
}

// ─── In-Memory OTP Store ─────────────────────────────────────────────────────
// { phone: { otp, expiresAt, verified } }
const otpStore = {};

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── Multer Setup ─────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

// ─── Data Helpers ─────────────────────────────────────────────────────────────
function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return {
      rates: { gold: 7250, silver: 92, oldSilver: 85 },
      storeDetails: { ownerName: '', contactNo: '', address: '' },
      hostPassword: 'admin123',
      hostPhone: '',
      ornaments: [],
      orders: []
    };
  }
}
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ─── General Routes ───────────────────────────────────────────────────────────
app.get('/api/data', (req, res) => res.json(readData()));

app.post('/api/rates', (req, res) => {
  const data = readData();
  data.rates = { ...data.rates, ...req.body };
  writeData(data);
  res.json({ message: 'Rates updated', rates: data.rates });
});

app.post('/api/store', (req, res) => {
  const data = readData();
  data.storeDetails = { ...data.storeDetails, ...req.body };
  // Save host phone separately for OTP
  if (req.body.contactNo) data.hostPhone = req.body.contactNo;
  writeData(data);
  res.json({ message: 'Store details updated', storeDetails: data.storeDetails });
});

app.post('/api/upload', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ imageUrl: `http://localhost:${PORT}/uploads/${req.file.filename}` });
});

app.post('/api/ornaments', (req, res) => {
  const data = readData();
  const ornament = { id: Date.now(), ...req.body };
  data.ornaments.push(ornament);
  writeData(data);
  res.json({ message: 'Ornament added', ornament });
});

app.delete('/api/ornaments/:id', (req, res) => {
  const data = readData();
  const id = Number(req.params.id);
  const index = data.ornaments.findIndex(o => o.id === id);
  if (index === -1) return res.status(404).json({ error: 'Ornament not found' });
  data.ornaments.splice(index, 1);
  writeData(data);
  res.json({ message: 'Ornament removed successfully' });
});

app.post('/api/orders', (req, res) => {
  const data = readData();
  const order = { id: Date.now(), ...req.body };
  data.orders.unshift(order);
  writeData(data);
  res.json({ message: 'Order placed', order });
});

// ─── Password & OTP Routes ────────────────────────────────────────────────────

// Verify current password (login)
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  const data = readData();
  const hostPassword = data.hostPassword || 'admin123';
  if (password === hostPassword) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Incorrect password' });
  }
});

// Send OTP to host phone
app.post('/api/auth/send-otp', async (req, res) => {
  const data = readData();
  const hostPhone = data.hostPhone || data.storeDetails?.contactNo || '';

  if (!hostPhone) {
    return res.status(400).json({
      success: false,
      message: 'No host phone number found. Please update your Store Info in the dashboard first.'
    });
  }

  const otp = generateOTP();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  otpStore[hostPhone] = { otp, expiresAt, verified: false };

  const message = `SOFIYA JEWELLERS: Your password reset OTP is ${otp}. Valid for 5 minutes. Do not share with anyone.`;

  if (twilioClient) {
    try {
      await twilioClient.messages.create({
        body: message,
        from: TWILIO_FROM,
        to: hostPhone
      });
      console.log(`📱 OTP sent to ${hostPhone}`);
      res.json({ success: true, message: `OTP sent to your registered number ending in ${hostPhone.slice(-3)}` });
    } catch (err) {
      console.error('Twilio error:', err.message);
      res.status(500).json({ success: false, message: 'Failed to send OTP via SMS. Check Twilio config.' });
    }
  } else {
    // Fallback: print OTP to server console
    console.log('\n══════════════════════════════════════');
    console.log(`📲 [DEV MODE] OTP for ${hostPhone}: ${otp}`);
    console.log('══════════════════════════════════════\n');
    res.json({
      success: true,
      message: 'OTP generated. Check the server console (SMS not configured yet).',
      devOtp: otp  // Only in dev mode — remove this in production after Twilio is set up
    });
  }
});

// Verify OTP
app.post('/api/auth/verify-otp', (req, res) => {
  const { otp } = req.body;
  const data = readData();
  const hostPhone = data.hostPhone || data.storeDetails?.contactNo || '';
  const record = otpStore[hostPhone];

  if (!record) return res.status(400).json({ success: false, message: 'No OTP requested. Please request one first.' });
  if (Date.now() > record.expiresAt) {
    delete otpStore[hostPhone];
    return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
  }
  if (record.otp !== otp) return res.status(400).json({ success: false, message: 'Incorrect OTP. Please try again.' });

  // Mark as verified so reset-password can proceed
  otpStore[hostPhone].verified = true;
  res.json({ success: true, message: 'OTP verified successfully.' });
});

// Reset password (only after OTP verified)
app.post('/api/auth/reset-password', (req, res) => {
  const { newPassword } = req.body;
  const data = readData();
  const hostPhone = data.hostPhone || data.storeDetails?.contactNo || '';
  const record = otpStore[hostPhone];

  if (!record || !record.verified) {
    return res.status(403).json({ success: false, message: 'Please verify your OTP first.' });
  }
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }

  data.hostPassword = newPassword;
  writeData(data);
  delete otpStore[hostPhone];
  console.log('🔑 Host password reset successfully.');
  res.json({ success: true, message: 'Password reset successfully! You can now login.' });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});
