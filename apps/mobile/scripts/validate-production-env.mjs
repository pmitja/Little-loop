const isProduction = process.env.LITTLELOOP_BUILD_ENV === 'production';

if (!isProduction) {
  console.log('Skipping production environment validation for a non-production build.');
  process.exit(0);
}

const platform = process.env.EAS_BUILD_PLATFORM;
const errors = [];

function isPrivateHostname(hostname) {
  const normalized = hostname.toLowerCase();
  if (
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized.endsWith('.local') ||
    normalized === '0.0.0.0' ||
    normalized === '::1'
  ) {
    return true;
  }

  const octets = normalized.split('.').map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part))) {
    return false;
  }

  return (
    octets[0] === 10 ||
    octets[0] === 127 ||
    (octets[0] === 169 && octets[1] === 254) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
}

function validatePublicHttpsUrl(name, expectedPathPrefix) {
  const raw = process.env[name];
  if (!raw) {
    errors.push(`${name} is missing`);
    return;
  }

  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') {
      errors.push(`${name} must use https`);
    }
    if (isPrivateHostname(url.hostname)) {
      errors.push(`${name} must not point to localhost or a private network`);
    }
    if (expectedPathPrefix && !url.pathname.startsWith(expectedPathPrefix)) {
      errors.push(`${name} must use a path beginning with ${expectedPathPrefix}`);
    }
  } catch {
    errors.push(`${name} is not a valid URL`);
  }
}

validatePublicHttpsUrl('EXPO_PUBLIC_API_URL', '/api/v1');
validatePublicHttpsUrl('EXPO_PUBLIC_INVITE_URL', '/invite');

if (process.env.EXPO_PUBLIC_REVENUECAT_KEY) {
  errors.push(
    'EXPO_PUBLIC_REVENUECAT_KEY must be unset in production; use the platform-specific store key',
  );
}

if (platform === 'ios') {
  const key = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
  if (!key.startsWith('appl_')) {
    errors.push('EXPO_PUBLIC_REVENUECAT_IOS_KEY must be an App Store key beginning with appl_');
  }
} else if (platform === 'android') {
  const key = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';
  if (!key.startsWith('goog_')) {
    errors.push('EXPO_PUBLIC_REVENUECAT_ANDROID_KEY must be a Play Store key beginning with goog_');
  }
} else {
  errors.push('EAS_BUILD_PLATFORM must be ios or android for a production build');
}

if (errors.length > 0) {
  console.error('Invalid LittleLoop production environment:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Production environment is valid for ${platform}.`);
